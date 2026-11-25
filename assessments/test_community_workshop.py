from collections import Counter
import json
from pathlib import Path
import random
import runpy
import unittest


PACK_DIR = Path(__file__).with_name("community-workshop")


class WorkshopLedger:
    """Independent model that sums entries from a signed reservation ledger."""

    def __init__(self):
        self.owners = {}
        self.access = set()
        self.quotas = {}
        self.events = []

    def owners_match(self, team, actor):
        return self.owners.get(team) == actor

    def holdings(self, team):
        amounts = Counter()
        for changed_team, material, delta in self.events:
            if changed_team == team:
                amounts[material] += delta
        return amounts

    def has_access(self, team, person):
        return self.owners_match(team, person) or (team, person) in self.access

    def post(self, team, actor, entries):
        if not self.has_access(team, actor) or not entries:
            return False
        saved_length = len(self.events)
        for material, delta in entries:
            self.events.append((team, material, delta))
            amounts = self.holdings(team)
            if delta == 0 or min(amounts.values()) < 0 or amounts.total() > self.quotas[team]:
                del self.events[saved_length:]
                return False
        return True

    def call(self, method, args):
        if method == "register_team":
            team, owner = args
            if team in self.owners:
                return False
            self.owners[team] = owner
            self.quotas[team] = 0
            return True
        if method == "has_access":
            return self.has_access(*args)
        if method in {"grant_access", "revoke_access"}:
            team, actor, person = args
            granted = (team, person) in self.access
            if not self.owners_match(team, actor) or person == actor:
                return False
            if method == "grant_access" and not granted:
                self.access.add((team, person))
                return True
            if method == "revoke_access" and granted:
                self.access.remove((team, person))
                return True
            return False
        if method == "set_quota":
            team, actor, quota = args
            if not self.owners_match(team, actor) or quota < self.holdings(team).total():
                return False
            self.quotas[team] = quota
            return True
        if method == "reservation":
            team, actor, material = args
            return self.holdings(team)[material] if self.has_access(team, actor) else None
        if method == "available":
            team, actor = args
            return self.quotas[team] - self.holdings(team).total() if self.has_access(team, actor) else None
        if method == "change_reservation":
            team, actor, material, delta = args
            return self.post(team, actor, [[material, delta]])
        if method == "transact":
            return self.post(*args)
        if method == "merge_teams":
            target, source, actor = args
            if target == source or not all(self.owners_match(team, actor) for team in (target, source)):
                return False
            saved_length = len(self.events)
            self.events.extend(
                (target, material, amount)
                for material, amount in self.holdings(source).items() if amount
            )
            if self.holdings(target).total() > self.quotas[target]:
                del self.events[saved_length:]
                return False
            self.events = [event for event in self.events if event[0] != source]
            inherited = {(target, person) for team, person in self.access if team == source}
            self.access = {(team, person) for team, person in self.access if team != source} | inherited
            del self.owners[source]
            del self.quotas[source]
            return True
        raise ValueError(f"Unknown method: {method}")


def random_steps(seed, count):
    randomizer = random.Random(seed)
    teams = ["ceramics", "paper", "metal"]
    people = ["lee", "kim", "nia"]
    materials = ["clay", "wire", "paint"]
    for _ in range(count):
        team = randomizer.choice(teams)
        actor = randomizer.choice(["lee", "lee", "kim", "nia"])
        person = randomizer.choice(people)
        material = randomizer.choice(materials)
        delta = randomizer.randint(-4, 4)
        yield randomizer.choice([
            ("register_team", [team, actor]),
            ("has_access", [team, person]),
            ("grant_access", [team, actor, person]),
            ("revoke_access", [team, actor, person]),
            ("set_quota", [team, actor, randomizer.randint(-1, 14)]),
            ("change_reservation", [team, actor, material, delta]),
            ("reservation", [team, actor, material]),
            ("available", [team, actor]),
            ("transact", [team, actor, [
                [randomizer.choice(materials), randomizer.randint(-4, 4)]
                for _ in range(randomizer.randint(0, 4))
            ]]),
            ("merge_teams", [team, randomizer.choice(teams), actor]),
        ])


class CommunityWorkshopTests(unittest.TestCase):
    def setUp(self):
        reference = PACK_DIR / "reference.py"
        self.assertTrue(reference.is_file(), "The Python reference is missing")
        self.reference_type = runpy.run_path(str(reference))["Workshop"]

    def assert_result(self, actual, expected):
        self.assertEqual(json.dumps(actual, sort_keys=True), json.dumps(expected, sort_keys=True))

    def test_every_fixture_expectation_matches_reference_and_independent_model(self):
        pack = json.loads((PACK_DIR / "pack.json").read_text())
        for level in pack["levels"]:
            for case in level["visible"] + level["hidden"]:
                reference = self.reference_type()
                ledger = WorkshopLedger()
                for index, step in enumerate(case["steps"]):
                    with self.subTest(case=case["id"], step=index, method=step["method"]):
                        method, args, expected = step["method"], step["args"], step["expected"]
                        self.assert_result(getattr(reference, method)(*args), expected)
                        self.assert_result(ledger.call(method, args), expected)

    def test_randomized_operations_match_independent_ledger(self):
        outcomes = {method: set() for method in ("transact", "merge_teams")}
        for seed in range(40):
            reference = self.reference_type()
            ledger = WorkshopLedger()
            for index, (method, args) in enumerate(random_steps(seed, 220)):
                with self.subTest(seed=seed, step=index, method=method, args=args):
                    actual = getattr(reference, method)(*args)
                    self.assert_result(actual, ledger.call(method, args))
                    if method in outcomes:
                        outcomes[method].add(actual)
        self.assertEqual(outcomes, {"transact": {True, False}, "merge_teams": {True, False}})
