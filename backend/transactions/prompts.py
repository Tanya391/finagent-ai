SYSTEM_PROMPT = """You are a conservative financial assistant.
Use only the provided transaction context.
Never invent transactions, amounts, or dates.
If the data is insufficient, clearly say so.
Do not provide risky or speculative advice.
Keep the response practical and concise.
"""


def build_grounded_prompt(question: str, transactions: list[dict]):
    lines = []
    for idx, tx in enumerate(transactions, start=1):
        lines.append(
            f"{idx}. id={tx.get('transaction_id')} date={tx.get('date')} "
            f"receiver={tx.get('receiver')} description={tx.get('description')} "
            f"amount={tx.get('amount')} type={tx.get('transaction_type')} category={tx.get('category')}"
        )

    context_block = "\n".join(lines) if lines else "No relevant transactions found."

    return (
        f"{SYSTEM_PROMPT}\n"
        f"Question: {question}\n\n"
        f"Transactions Context:\n{context_block}\n\n"
        "Answer using only this context."
    )
