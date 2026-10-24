"""Run the Campus Customs team once from the command line.

    .venv/Scripts/python.exe run_team.py
    .venv/Scripts/python.exe run_team.py "Work ticket 102 only."

Prints the Boss's TeamReport. Every step is appended to output/audit_trail.json.
"""

from __future__ import annotations

import asyncio
import sys

from team import run_team

DEFAULT_MESSAGE = (
    "Work every open ticket in the queue. For each one, get the facts from the right teammates, "
    "set the ticket status, leave a note, and tell me what needs my approval."
)


async def main() -> None:
    message = " ".join(sys.argv[1:]) or DEFAULT_MESSAGE
    run_id, report = await run_team(message)
    print(f"run_id: {run_id}")
    print(report.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())
