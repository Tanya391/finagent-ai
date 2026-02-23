import argparse
import csv
import random
from datetime import datetime, timedelta
from pathlib import Path


DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "data" / "sample_transactions.csv"


def generate_rows(start_date: datetime, end_date: datetime, opening_balance: int, seed: int):
    random.seed(seed)

    salary_amount = 60000
    rent_amount = 15000
    merchants = [
        "Amazon",
        "Flipkart",
        "Swiggy",
        "Zomato",
        "Blinkit",
        "Uber",
        "Ola",
        "Myntra",
        "Electricity Bill",
        "Mobile Recharge",
    ]
    upi_contacts = ["Rahul", "Aman", "Neha", "Priya"]

    balance = opening_balance
    rows = []
    current_date = start_date

    while current_date <= end_date:
        if current_date.day == 1:
            balance += salary_amount
            rows.append(
                [
                    current_date.strftime("%Y-%m-%d"),
                    "Company Pvt Ltd",
                    "Salary Credit",
                    salary_amount,
                    "credit",
                    balance,
                ]
            )

        if current_date.day == 5:
            balance -= rent_amount
            rows.append(
                [
                    current_date.strftime("%Y-%m-%d"),
                    "Landlord",
                    "House Rent",
                    rent_amount,
                    "debit",
                    balance,
                ]
            )

        # Random daily transactions (0-2 per day).
        for _ in range(random.randint(0, 2)):
            amount = random.randint(200, 5000)
            transaction_type = random.choice(["debit", "credit"])

            if transaction_type == "debit":
                if balance < amount:
                    continue
                balance -= amount
            else:
                balance += amount

            receiver = random.choice(merchants + upi_contacts)
            description = "Online Payment" if receiver in merchants else "UPI Transfer"
            rows.append(
                [
                    current_date.strftime("%Y-%m-%d"),
                    receiver,
                    description,
                    amount,
                    transaction_type,
                    balance,
                ]
            )

        current_date += timedelta(days=1)

    return rows


def write_csv(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open(mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["date", "receiver", "description", "amount", "transaction_type", "balance"])
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="Generate sample transaction CSV data.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output CSV file path.")
    parser.add_argument("--seed", type=int, default=7, help="Random seed for reproducible output.")
    args = parser.parse_args()

    rows = generate_rows(
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 2, 29),
        opening_balance=50000,
        seed=args.seed,
    )
    write_csv(args.output, rows)
    print(f"CSV file created at: {args.output}")


if __name__ == "__main__":
    main()
