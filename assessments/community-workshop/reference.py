"""Reference implementation for the Community Workshop assessment."""

from dataclasses import dataclass, field


@dataclass
class Team:
    owner: str
    quota: int = 0
    members: set[str] = field(default_factory=set)
    reservations: dict[str, int] = field(default_factory=dict)

    def permits(self, person):
        return person == self.owner or person in self.members

    def usage(self):
        return sum(self.reservations.values())


class Workshop:
    def __init__(self):
        self._teams = {}

    def _owned_team(self, team_id, actor):
        team = self._teams.get(team_id)
        return team if team is not None and team.owner == actor else None

    def _accessible_team(self, team_id, actor):
        team = self._teams.get(team_id)
        return team if team is not None and team.permits(actor) else None

    def register_team(self, team_id, owner):
        if team_id in self._teams:
            return False
        self._teams[team_id] = Team(owner)
        return True

    def grant_access(self, team_id, actor, person):
        team = self._owned_team(team_id, actor)
        if team is None or team.permits(person):
            return False
        team.members.add(person)
        return True

    def revoke_access(self, team_id, actor, person):
        team = self._owned_team(team_id, actor)
        if team is None or person not in team.members:
            return False
        team.members.remove(person)
        return True

    def has_access(self, team_id, person):
        return self._accessible_team(team_id, person) is not None

    def set_quota(self, team_id, actor, quota):
        team = self._owned_team(team_id, actor)
        if team is None or quota < team.usage():
            return False
        team.quota = quota
        return True

    def change_reservation(self, team_id, actor, material, delta):
        return self.transact(team_id, actor, [[material, delta]])

    def reservation(self, team_id, actor, material):
        team = self._accessible_team(team_id, actor)
        return team.reservations.get(material, 0) if team is not None else None

    def available(self, team_id, actor):
        team = self._accessible_team(team_id, actor)
        return team.quota - team.usage() if team is not None else None

    def transact(self, team_id, actor, changes):
        team = self._accessible_team(team_id, actor)
        if team is None or not changes:
            return False
        draft = team.reservations.copy()
        used = team.usage()
        for material, delta in changes:
            amount = draft.get(material, 0) + delta
            used += delta
            if delta == 0 or amount < 0 or used > team.quota:
                return False
            draft[material] = amount
        team.reservations = draft
        return True

    def merge_teams(self, target_id, source_id, actor):
        if target_id == source_id:
            return False
        target = self._owned_team(target_id, actor)
        source = self._owned_team(source_id, actor)
        if target is None or source is None or target.usage() + source.usage() > target.quota:
            return False

        for material, amount in source.reservations.items():
            target.reservations[material] = target.reservations.get(material, 0) + amount
        target.members.update(source.members)
        del self._teams[source_id]
        return True
