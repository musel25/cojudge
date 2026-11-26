import json
from pathlib import Path
import random
import runpy
import unittest


PACK_DIR = Path(__file__).with_name("bike-repair-desk")
SHOPS = ("canal", "station")
SKUS = ("chain-9s", "tube-700x35", "pad-b01s", "housing-4mm")


class ShelfLedger:
    """Recount shelves from receipts and tickets, with no stock counters."""

    def __init__(self):
        self.receipts = []
        self.tickets = {}

    def _stock(self, shop, sku):
        received = sum(
            units for at, part, units in self.receipts
            if (at, part) == (shop, sku)
        )
        committed = {"completed": 0, "approved": 0}
        for status, at, _, _, lines in self.tickets.values():
            if at == shop and status in committed:
                committed[status] += sum(units for part, units, _ in lines if part == sku)
        on_hand = received - committed["completed"]
        return [on_hand, on_hand - committed["approved"]]

    def dispatch(self, method, args):
        if method == "receive":
            shop, sku, units = args
            if shop not in SHOPS or units <= 0:
                return False
            self.receipts.append((shop, sku, units))
            return True
        if method == "stock":
            shop, sku = args
            return self._stock(shop, sku) if shop in SHOPS else None

        ticket = args[0]
        entry = self.tickets.get(ticket)
        if method == "open_estimate":
            _, bike, shop, fee = args
            if entry is not None or shop not in SHOPS or fee < 0:
                return False
            self.tickets[ticket] = ("estimate", shop, bike, fee, ())
            return True
        if entry is None:
            return None if method in ("view", "complete") else False

        status, shop, bike, fee, lines = entry
        total = fee + sum(units * price for _, units, price in lines)
        if method == "view":
            return dict(
                status=status, shop=shop, bike=bike, total_cents=total,
                parts=[list(line) for line in sorted(lines)],
            )
        if method == "set_part":
            _, sku, units, price = args
            if status != "estimate" or min(units, price) < 0:
                return False
            remaining = tuple(line for line in lines if line[0] != sku)
            amended = remaining + ((sku, units, price),) if units else remaining
            self.tickets[ticket] = (status, shop, bike, fee, amended)
            return True
        if method == "complete":
            if status != "approved":
                return None
            self.tickets[ticket] = ("completed", shop, bike, fee, lines)
            return total
        if status not in ("estimate", "approved"):
            return False
        if method == "cancel":
            self.tickets[ticket] = ("canceled", shop, bike, fee, lines)
            return True

        if method == "approve":
            if status != "estimate":
                return False
            new_status, destination = "approved", shop
        elif method == "move":
            _, destination = args
            if destination not in SHOPS:
                return False
            if shop == destination:
                return True
            new_status = status
        else:
            raise AssertionError(f"Unexpected method {method}")

        if new_status == "approved":
            if any(units > self._stock(destination, sku)[1] for sku, units, _ in lines):
                return False
        self.tickets[ticket] = (new_status, destination, bike, fee, lines)
        return True


def shifts(randomizer):
    """Practice overlapping ticket lifecycles and both shelves in each shift."""
    for index in range(18):
        ticket = f"C-{index:03}"
        other = f"S-{index:03}"
        first, second = randomizer.sample(SHOPS, 2)
        sku, second_sku = randomizer.sample(SKUS, 2)
        yield "receive", [first, sku, randomizer.randrange(0, 4)]
        yield "receive", [second, sku, randomizer.randrange(0, 4)]
        yield "receive", [first, second_sku, randomizer.randrange(1, 4)]
        yield "open_estimate", [ticket, "commuter", first, randomizer.randrange(0, 5) * 500]
        yield "open_estimate", [other, "folding bike", second, 2000]
        yield "set_part", [ticket, sku, randomizer.randrange(1, 4), 950]
        yield "set_part", [ticket, second_sku, randomizer.randrange(0, 2), 350]
        yield "set_part", [other, sku, randomizer.randrange(1, 4), 1100]
        yield "approve", [ticket]
        yield "approve", [other]
        yield "move", [ticket, randomizer.choice((first, second, "warehouse"))]
        yield "stock", [first, sku]
        yield "stock", [second, sku]
        yield randomizer.choice(("complete", "cancel")), [other]
        yield "move", [ticket, second]
        yield "approve", [ticket]
        yield randomizer.choice(("complete", "cancel")), [ticket]
        yield "complete", [ticket]
        yield "stock", [first, sku]
        yield "stock", [second, sku]
        yield "view", [ticket]
        yield "view", [other]


class BikeRepairDeskTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pack = json.loads((PACK_DIR / "pack.json").read_text(encoding="utf-8"))
        cls.reference = runpy.run_path(str(PACK_DIR / "reference.py"))[cls.pack["className"]]

    def assert_same_json_value(self, observed, expected):
        self.assertEqual(json.dumps(observed, sort_keys=True), json.dumps(expected, sort_keys=True))

    def test_all_fixed_values_match_the_reference_and_ledger(self):
        steps_checked = 0
        for level in self.pack["levels"]:
            for scenario in level["visible"] + level["hidden"]:
                desk, ledger = self.reference(), ShelfLedger()
                for index, step in enumerate(scenario["steps"]):
                    method, args, expected = step["method"], step["args"], step["expected"]
                    with self.subTest(case=scenario["id"], step=index, method=method):
                        self.assert_same_json_value(ledger.dispatch(method, args), expected)
                        self.assert_same_json_value(getattr(desk, method)(*args), expected)
                    steps_checked += 1
        self.assertGreaterEqual(steps_checked, 160)

    def test_random_shifts_match_an_independently_recounted_ledger(self):
        moves = set()
        completions = set()
        for seed in range(24):
            desk, ledger = self.reference(), ShelfLedger()
            for index, (method, args) in enumerate(shifts(random.Random(seed))):
                with self.subTest(seed=seed, step=index, method=method):
                    expected = ledger.dispatch(method, args)
                    observed = getattr(desk, method)(*args)
                    self.assert_same_json_value(observed, expected)
                    if method == "move":
                        moves.add(observed)
                    if method == "complete":
                        completions.add(observed is not None)
                    if method == "stock":
                        on_hand, available = observed
                        self.assertTrue(0 <= available <= on_hand)
        self.assertEqual(moves, {True, False})
        self.assertEqual(completions, {True, False})

    def test_the_printed_quote_is_a_snapshot(self):
        desk = self.reference()
        desk.open_estimate("S-9", "old touring bike", "station", 2000)
        desk.set_part("S-9", "chain-9s", 1, 1800)
        quote = desk.view("S-9")
        quote["parts"][0][1] = 5
        quote["shop"] = "canal"
        current = desk.view("S-9")
        self.assertEqual(current["parts"], [["chain-9s", 1, 1800]])
        self.assertEqual(current["shop"], "station")
        self.assertEqual(current["total_cents"], 3800)
