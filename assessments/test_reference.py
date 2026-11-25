import json
from pathlib import Path
import random
import runpy
import unittest


PACK_DIR = Path(__file__).with_name("tool-lending-desk")


class DeskModel:
    """Small oracle that copies the catalog for each revision."""

    def __init__(self):
        self.catalogs = [{}]
        self.issued = set()
        self.scheduled = {}

    def call(self, method, args):
        catalog = self.catalogs[-1]
        if method in {"add_tool", "update_tool", "remove_tool"}:
            tool = args[0]
            if (tool in catalog) == (method == "add_tool"):
                return False
            stock = dict(catalog)
            if method == "remove_tool":
                del stock[tool]
                self.scheduled = {
                    key: entry for key, entry in self.scheduled.items()
                    if entry[0] != tool
                }
            else:
                category, units = args[1:]
                if units < 1:
                    return False
                stock[tool] = [category, units]
            self.catalogs.append(stock)
            return True
        if method == "get_tool":
            return catalog.get(args[0])
        if method == "total_units":
            return sum(units for category, units in catalog.values() if category == args[0])
        if method == "top_tools":
            ranked = sorted(catalog)
            ranked.sort(key=lambda tool: catalog[tool][1], reverse=True)
            return ranked[:max(args[0], 0)]
        if method == "schedule_hold":
            hold, tool, start, ttl, now = args
            if hold in self.issued or tool not in catalog or start < now or ttl <= 0:
                return False
            self.issued.add(hold)
            self.scheduled[hold] = tool, range(start, start + ttl)
            return True
        if method == "cancel_hold":
            hold, now = args
            if hold not in self.scheduled or now >= self.scheduled[hold][1].stop:
                return False
            del self.scheduled[hold]
            return True
        if method == "active_holds":
            tool, now = args
            return sorted(
                hold for hold, (owner, interval) in self.scheduled.items()
                if owner == tool and now in interval
            )
        if method == "revision":
            return len(self.catalogs) - 1
        if method == "tool_at":
            tool, revision = args
            if revision in range(len(self.catalogs)):
                return self.catalogs[revision].get(tool)
            return None
        raise ValueError(f"Unknown method: {method}")


def random_steps(seed, count):
    randomizer = random.Random(seed)
    tools = ["awl", "bit", "clamp"]
    categories = ["cutting", "measuring", "fastening"]
    holds = ["h1", "h2", "h3", "h4", "h5"]
    now = 0
    for _ in range(count):
        tool = randomizer.choice(tools)
        category = randomizer.choice(categories)
        units = randomizer.randint(-1, 5)
        hold = randomizer.choice(holds)
        now += randomizer.choice([0, 0, 0, 1, 2])
        method, args = randomizer.choice([
            ("add_tool", [tool, category, units]),
            ("get_tool", [tool]),
            ("update_tool", [tool, category, units]),
            ("remove_tool", [tool]),
            ("total_units", [category]),
            ("top_tools", [units]),
            ("schedule_hold", [hold, tool, now + randomizer.randint(-1, 3),
                               randomizer.randint(0, 4), now]),
            ("cancel_hold", [hold, now]),
            ("active_holds", [tool, now]),
            ("revision", []),
            ("tool_at", [tool, randomizer.randint(-1, 40)]),
        ])
        yield method, args


class ToolLendingDeskTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue((PACK_DIR / "reference.py").is_file(), "The Python reference is missing")
        self.reference_type = runpy.run_path(str(PACK_DIR / "reference.py"))["LendingDesk"]

    def assert_result(self, actual, expected):
        self.assertEqual(json.dumps(actual, sort_keys=True), json.dumps(expected, sort_keys=True))

    def test_all_pack_expectations_match_reference_and_oracle(self):
        pack = json.loads((PACK_DIR / "pack.json").read_text())
        for level in pack["levels"]:
            for case in level["visible"] + level["hidden"]:
                with self.subTest(case=case["id"]):
                    reference = self.reference_type()
                    oracle = DeskModel()
                    for index, step in enumerate(case["steps"]):
                        with self.subTest(step=index, method=step["method"]):
                            actual = getattr(reference, step["method"])(*step["args"])
                            self.assert_result(actual, step["expected"])
                            self.assert_result(oracle.call(step["method"], step["args"]), step["expected"])

    def test_randomized_operation_sequences_match_independent_model(self):
        for seed in range(32):
            reference = self.reference_type()
            oracle = DeskModel()
            for index, (method, args) in enumerate(random_steps(seed, 150)):
                with self.subTest(seed=seed, operation=index, method=method, args=args):
                    self.assert_result(getattr(reference, method)(*args), oracle.call(method, args))

    def test_returned_catalog_entries_do_not_expose_mutable_state(self):
        desk = self.reference_type()
        self.assertTrue(desk.add_tool("awl", "cutting", 2))
        desk.get_tool("awl")[0] = "other"
        desk.tool_at("awl", 1)[1] = 9
        self.assertEqual(desk.get_tool("awl"), ["cutting", 2])
        self.assertEqual(desk.tool_at("awl", 1), ["cutting", 2])
