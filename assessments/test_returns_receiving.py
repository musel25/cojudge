from collections import defaultdict
import json
from pathlib import Path
from random import Random
import runpy
import unittest


PACK_DIR = Path(__file__).with_name("returns-receiving")


class ReceivingJournal:
    """Independent model. Derive all balances from accepted journal entries."""

    def __init__(self):
        self.events = defaultdict(list)

    def find(self, event, key):
        return next((row for row in self.events[event] if row[0] == key), None)

    def tally(self, event, match, amount):
        return sum(row[amount] for row in self.events[event] if match(row))

    def authorized(self, claim):
        decision = self.find("authorize_return", claim)
        return decision[1] if decision else 0

    def refundable(self, claim):
        _, order, sku, _ = self.find("request_return", claim)
        unit_cents = self.find("record_sale", (order, sku))[2]
        parcels = {parcel for parcel, related_claim, _ in self.events["receive_parcel"] if related_claim == claim}
        inspected_units = sum(sellable + damaged for parcel, sellable, damaged in self.events["inspect_units"]
                              if parcel in parcels)
        return inspected_units * unit_cents

    def paid(self, claim):
        return self.tally("issue_refund", lambda row: row[1] == claim, 2)

    def call(self, method, args):
        if method == "record_sale":
            order, sku, quantity, cents = args
            key = (order, sku)
            if quantity <= 0 or cents <= 0 or self.find(method, key):
                return False
            self.events[method].append((key, quantity, cents))
            return True

        if method == "request_return":
            claim, order, sku, quantity = args
            sale = self.find("record_sale", (order, sku))
            if self.find(method, claim) or not sale or not 0 < quantity <= sale[1]:
                return False

        elif method == "authorize_return":
            claim, quantity = args
            request = self.find("request_return", claim)
            if not request or self.authorized(claim) or not 0 < quantity <= request[3]:
                return False
            _, order, sku, _ = request
            committed = sum(self.authorized(related) for related, sale_order, sale_sku, _
                            in self.events["request_return"] if (sale_order, sale_sku) == (order, sku))
            if committed + quantity > self.find("record_sale", (order, sku))[1]:
                return False

        elif method == "return_status":
            claim, = args
            request = self.find("request_return", claim)
            return [request[3], self.authorized(claim)] if request else None

        elif method == "receive_parcel":
            parcel, claim, quantity = args
            already_received = self.tally(method, lambda row: row[1] == claim, 2)
            if self.find(method, parcel) or not 0 < quantity <= self.authorized(claim) - already_received:
                return False

        elif method == "inspect_units":
            parcel, sellable, damaged = args
            receipt = self.find("receive_parcel", parcel)
            if not receipt or min(sellable, damaged) < 0:
                return False
            _, already_sellable, already_damaged = self.call("parcel_status", [parcel])
            if not 0 < sellable + damaged <= receipt[2] - already_sellable - already_damaged:
                return False

        elif method == "parcel_status":
            parcel, = args
            receipt = self.find("receive_parcel", parcel)
            if not receipt:
                return None
            return [receipt[2],
                    self.tally("inspect_units", lambda row: row[0] == parcel, 1),
                    self.tally("inspect_units", lambda row: row[0] == parcel, 2)]

        elif method == "restock":
            parcel, _, quantity = args
            status = self.call("parcel_status", [parcel])
            used = self.tally(method, lambda row: row[0] == parcel, 2)
            if not status or not 0 < quantity <= status[1] - used:
                return False

        elif method == "stock_added":
            sku, location = args
            parcel_ids = set()
            for parcel, claim, _ in self.events["receive_parcel"]:
                if self.find("request_return", claim)[2] == sku:
                    parcel_ids.add(parcel)
            return self.tally("restock", lambda row: row[0] in parcel_ids and row[1] == location, 2)

        elif method in {"refund_due", "refund_paid"}:
            claim, = args
            if not self.find("request_return", claim):
                return None
            paid = self.paid(claim)
            return paid if method == "refund_paid" else self.refundable(claim) - paid

        elif method == "issue_refund":
            payment, claim, amount = args
            earlier = self.find(method, payment)
            if earlier:
                return amount if earlier[1:] == (claim, amount) else None
            due = self.call("refund_due", [claim])
            if due is None or not 0 < amount <= due:
                return None
            self.events[method].append(tuple(args))
            return amount

        else:
            raise ValueError(f"Unknown method: {method}")

        self.events[method].append(tuple(args))
        return True


def random_steps(seed):
    rng = Random(seed)
    for order, sku in (("R31", "desk-lamp"), ("R31", "clamp-lamp"), ("R32", "desk-lamp")):
        yield "record_sale", [order, sku, 12, rng.choice([495, 1295, 3499])]
    for number in range(3):
        claim, parcel = f"return-{number}", f"parcel-{number}"
        yield "request_return", [claim, "R31", "desk-lamp", 4]
        yield "authorize_return", [claim, 4]
        yield "receive_parcel", [parcel, claim, 3]
        yield "inspect_units", [parcel, 1, 1]
        yield "restock", [parcel, "shop", 1]
        yield "issue_refund", [f"payout-{number}", claim, 97]
    for _ in range(180):
        order = rng.choice(["R31", "R32", "missing"])
        sku = rng.choice(["desk-lamp", "clamp-lamp", "wire-cover"])
        claim = f"return-{rng.randrange(8)}"
        parcel = f"parcel-{rng.randrange(12)}"
        payment = f"payout-{rng.randrange(8)}"
        location = rng.choice(["shop", "backroom"])
        quantity = rng.randrange(-1, 7)
        yield rng.choice([
            ("record_sale", [order, sku, quantity, rng.choice([-50, 0, 657])]),
            ("request_return", [claim, order, sku, quantity]),
            ("authorize_return", [claim, quantity]),
            ("return_status", [claim]),
            ("receive_parcel", [parcel, claim, quantity]),
            ("inspect_units", [parcel, rng.randrange(-1, 4), rng.randrange(-1, 4)]),
            ("parcel_status", [parcel]),
            ("restock", [parcel, location, quantity]),
            ("stock_added", [sku, location]),
            ("refund_due", [claim]),
            ("issue_refund", [payment, claim, rng.choice([-1, 0, 97, 499, 1024, 8999])]),
            ("refund_paid", [claim]),
        ])


class ReturnsReceivingTests(unittest.TestCase):
    def setUp(self):
        reference = PACK_DIR / "reference.py"
        self.assertTrue(reference.is_file(), "The Returns Receiving reference is missing")
        self.reference_type = runpy.run_path(str(reference))["ReturnsDesk"]

    def assert_result(self, actual, expected):
        self.assertEqual(json.dumps(actual, sort_keys=True), json.dumps(expected, sort_keys=True))

    def test_fixed_cases_match_reference_and_journal(self):
        pack = json.loads((PACK_DIR / "pack.json").read_text())
        for level in pack["levels"]:
            for case in level["visible"] + level["hidden"]:
                reference = self.reference_type()
                journal = ReceivingJournal()
                for index, step in enumerate(case["steps"]):
                    method, args, expected = step["method"], step["args"], step["expected"]
                    with self.subTest(case=case["id"], index=index, method=method):
                        self.assert_result(getattr(reference, method)(*args), expected)
                        self.assert_result(journal.call(method, args), expected)

    def test_randomized_operations_match_receiving_journal(self):
        observed = {method: set() for method in ("receive_parcel", "inspect_units", "restock", "issue_refund")}
        for seed in range(40):
            reference = self.reference_type()
            journal = ReceivingJournal()
            for index, (method, args) in enumerate(random_steps(seed)):
                with self.subTest(seed=seed, index=index, method=method, args=args):
                    actual = getattr(reference, method)(*args)
                    self.assert_result(actual, journal.call(method, args))
                    if method in observed:
                        observed[method].add(bool(actual))
        for method, outcomes in observed.items():
            self.assertEqual(outcomes, {True, False}, method)
