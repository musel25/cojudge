from collections import Counter
from dataclasses import dataclass, field


@dataclass
class Ticket:
    bike: str
    shop: str
    labor_cents: int
    status: str = "estimate"
    parts: dict[str, tuple[int, int]] = field(default_factory=dict)

    def total(self):
        return self.labor_cents + sum(units * price for units, price in self.parts.values())


class RepairDesk:
    shops = {"canal", "station"}

    def __init__(self):
        self.tickets = {}
        self.on_hand = Counter()
        self.reserved = Counter()

    def open_estimate(self, ticket, bike, shop, labor_cents):
        if ticket in self.tickets or shop not in self.shops or labor_cents < 0:
            return False
        self.tickets[ticket] = Ticket(bike, shop, labor_cents)
        return True

    def set_part(self, ticket, sku, units, unit_cents):
        order = self.tickets.get(ticket)
        if order is None or order.status != "estimate" or units < 0 or unit_cents < 0:
            return False
        if units == 0:
            order.parts.pop(sku, None)
        else:
            order.parts[sku] = (units, unit_cents)
        return True

    def view(self, ticket):
        order = self.tickets.get(ticket)
        if order is None:
            return None
        return {
            "bike": order.bike,
            "shop": order.shop,
            "status": order.status,
            "parts": [[sku, *order.parts[sku]] for sku in sorted(order.parts)],
            "total_cents": order.total(),
        }

    def receive(self, shop, sku, units):
        if shop not in self.shops or units <= 0:
            return False
        self.on_hand[shop, sku] += units
        return True

    def stock(self, shop, sku):
        if shop not in self.shops:
            return None
        on_hand = self.on_hand[shop, sku]
        return [on_hand, on_hand - self.reserved[shop, sku]]

    def _has_available_parts(self, order, shop):
        return all(
            self.on_hand[shop, sku] - self.reserved[shop, sku] >= units
            for sku, (units, _) in order.parts.items()
        )

    def _change_reservation(self, order, direction):
        for sku, (units, _) in order.parts.items():
            self.reserved[order.shop, sku] += direction * units

    def approve(self, ticket):
        order = self.tickets.get(ticket)
        if order is None or order.status != "estimate":
            return False
        if not self._has_available_parts(order, order.shop):
            return False
        self._change_reservation(order, 1)
        order.status = "approved"
        return True

    def complete(self, ticket):
        order = self.tickets.get(ticket)
        if order is None or order.status != "approved":
            return None
        for sku, (units, _) in order.parts.items():
            self.on_hand[order.shop, sku] -= units
        self._change_reservation(order, -1)
        order.status = "completed"
        return order.total()

    def cancel(self, ticket):
        order = self.tickets.get(ticket)
        if order is None or order.status not in ("estimate", "approved"):
            return False
        if order.status == "approved":
            self._change_reservation(order, -1)
        order.status = "canceled"
        return True

    def move(self, ticket, shop):
        order = self.tickets.get(ticket)
        if order is None or order.status not in ("estimate", "approved") or shop not in self.shops:
            return False
        if order.shop == shop:
            return True
        if order.status == "approved":
            if not self._has_available_parts(order, shop):
                return False
            self._change_reservation(order, -1)
            order.shop = shop
            self._change_reservation(order, 1)
        else:
            order.shop = shop
        return True
