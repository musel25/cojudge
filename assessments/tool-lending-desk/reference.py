"""Reference implementation for Tool Lending Desk."""

from dataclasses import dataclass


@dataclass
class Hold:
    tool_id: str
    registration: int
    start: int
    end: int
    cancelled: bool = False


class LendingDesk:
    def __init__(self):
        self._tools = {}
        self._registrations = {}
        self._changes = {}
        self._revision = 0
        self._holds = {}

    def _record_change(self, tool_id, entry):
        self._revision += 1
        self._changes.setdefault(tool_id, []).append((self._revision, entry))

    def add_tool(self, tool_id, category, units):
        if tool_id in self._tools or units <= 0:
            return False
        entry = (category, units)
        self._tools[tool_id] = entry
        self._record_change(tool_id, entry)
        self._registrations[tool_id] = self._revision
        return True

    def get_tool(self, tool_id):
        entry = self._tools.get(tool_id)
        return None if entry is None else list(entry)

    def update_tool(self, tool_id, category, units):
        if tool_id not in self._tools or units <= 0:
            return False
        entry = (category, units)
        self._tools[tool_id] = entry
        self._record_change(tool_id, entry)
        return True

    def remove_tool(self, tool_id):
        if tool_id not in self._tools:
            return False
        del self._tools[tool_id]
        del self._registrations[tool_id]
        self._record_change(tool_id, None)
        return True

    def total_units(self, category):
        return sum(units for label, units in self._tools.values() if label == category)

    def top_tools(self, limit):
        return sorted(self._tools, key=lambda tool_id: (-self._tools[tool_id][1], tool_id))[
            :max(0, limit)
        ]

    def schedule_hold(self, hold_id, tool_id, start, ttl, now):
        if hold_id in self._holds or tool_id not in self._tools or start < now or ttl <= 0:
            return False
        self._holds[hold_id] = Hold(tool_id, self._registrations[tool_id], start, start + ttl)
        return True

    def cancel_hold(self, hold_id, now):
        hold = self._holds.get(hold_id)
        if (hold is None or hold.cancelled or now >= hold.end
                or self._registrations.get(hold.tool_id) != hold.registration):
            return False
        hold.cancelled = True
        return True

    def active_holds(self, tool_id, now):
        registration = self._registrations.get(tool_id)
        return sorted(
            hold_id for hold_id, hold in self._holds.items()
            if hold.tool_id == tool_id and hold.registration == registration
            and not hold.cancelled and hold.start <= now < hold.end
        )

    def revision(self):
        return self._revision

    def tool_at(self, tool_id, revision):
        if not 0 <= revision <= self._revision:
            return None
        for version, entry in reversed(self._changes.get(tool_id, ())):
            if version <= revision:
                return None if entry is None else list(entry)
        return None
