"""
Demo: formats ambiguity_flags that need supplier input into a ready-to-send email.
No email service required — returns the draft as a string for display in the CLI.
"""

from datetime import date
from typing import Optional

from models.intake import AmbiguityFlag, AmbiguityType


def draft_clarification_email(supplier_name: str, flags: list[AmbiguityFlag]) -> Optional[str]:
    actionable = [
        f for f in flags
        if f.type in (AmbiguityType.ABSENT, AmbiguityType.DEFERRED)
        and f.action_required
    ]
    if not actionable:
        return None

    questions = "\n".join(
        f"  {i + 1}. {_field_label(f.field)}: {f.action_required}"
        for i, f in enumerate(actionable)
    )

    return f"""Subject: A few questions about your Headout listing — {supplier_name}

Dear {supplier_name} team,

Thank you for providing your experience details. We're preparing your listing on Headout
and have a few questions before we go live. Your answers ensure the listing is accurate
and avoids any customer confusion.

{questions}

Please reply to this email or fill in our form at [FORM_LINK] and we'll update your
listing immediately.

Best,
Headout Catalog Team
{date.today().strftime("%B %d, %Y")}"""


def _field_label(field: str) -> str:
    return field.replace(".", " → ").replace("_", " ").title()
