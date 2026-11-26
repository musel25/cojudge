from collections import Counter
from dataclasses import dataclass


@dataclass
class _Sale:
    quantity: int
    unit_cents: int
    authorized: int = 0


@dataclass
class _Return:
    sale: _Sale
    sku: str
    requested: int
    authorized: int = 0
    received: int = 0
    inspected: int = 0
    paid: int = 0


@dataclass
class _Parcel:
    claim: _Return
    quantity: int
    sellable: int = 0
    damaged: int = 0
    restocked: int = 0


class ReturnsDesk:
    def __init__(self):
        self._sales: dict[tuple[str, str], _Sale] = {}
        self._returns: dict[str, _Return] = {}
        self._parcels: dict[str, _Parcel] = {}
        self._stock: Counter[tuple[str, str]] = Counter()
        self._payments: dict[str, tuple[str, int]] = {}

    def record_sale(self, order, sku, quantity, unit_cents):
        key = (order, sku)
        if key in self._sales or quantity <= 0 or unit_cents <= 0:
            return False
        self._sales[key] = _Sale(quantity, unit_cents)
        return True

    def request_return(self, claim, order, sku, quantity):
        sale = self._sales.get((order, sku))
        if not sale or claim in self._returns or not 0 < quantity <= sale.quantity:
            return False
        self._returns[claim] = _Return(sale, sku, quantity)
        return True

    def authorize_return(self, claim, quantity):
        record = self._returns.get(claim)
        if not record or record.authorized or not 0 < quantity <= record.requested:
            return False
        sale = record.sale
        if sale.authorized + quantity > sale.quantity:
            return False
        record.authorized = quantity
        sale.authorized += quantity
        return True

    def return_status(self, claim):
        record = self._returns.get(claim)
        return [record.requested, record.authorized] if record else None

    def receive_parcel(self, parcel, claim, quantity):
        record = self._returns.get(claim)
        if not record or parcel in self._parcels or not 0 < quantity <= record.authorized - record.received:
            return False
        self._parcels[parcel] = _Parcel(record, quantity)
        record.received += quantity
        return True

    def inspect_units(self, parcel, sellable, damaged):
        receipt = self._parcels.get(parcel)
        if not receipt or min(sellable, damaged) < 0:
            return False
        quantity = sellable + damaged
        if not 0 < quantity <= receipt.quantity - receipt.sellable - receipt.damaged:
            return False
        receipt.sellable += sellable
        receipt.damaged += damaged
        receipt.claim.inspected += quantity
        return True

    def parcel_status(self, parcel):
        receipt = self._parcels.get(parcel)
        return [receipt.quantity, receipt.sellable, receipt.damaged] if receipt else None

    def restock(self, parcel, location, quantity):
        receipt = self._parcels.get(parcel)
        if not receipt or not 0 < quantity <= receipt.sellable - receipt.restocked:
            return False
        receipt.restocked += quantity
        self._stock[receipt.claim.sku, location] += quantity
        return True

    def stock_added(self, sku, location):
        return self._stock[sku, location]

    def refund_due(self, claim):
        record = self._returns.get(claim)
        return self._remaining_credit(record) if record else None

    def refund_paid(self, claim):
        record = self._returns.get(claim)
        return record.paid if record else None

    def issue_refund(self, payment, claim, amount_cents):
        prior = self._payments.get(payment)
        if prior is not None:
            return amount_cents if prior == (claim, amount_cents) else None
        record = self._returns.get(claim)
        if not record or not 0 < amount_cents <= self._remaining_credit(record):
            return None
        self._payments[payment] = (claim, amount_cents)
        record.paid += amount_cents
        return amount_cents

    @staticmethod
    def _remaining_credit(record):
        return record.inspected * record.sale.unit_cents - record.paid
