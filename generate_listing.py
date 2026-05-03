#!/usr/bin/env python3
"""
Headout Listing Generation Pipeline — CLI entry point.

Usage:
  python generate_listing.py --input examples/supplier_happy_path.txt
  python generate_listing.py --input examples/supplier_contradiction.txt --output my_listing.json
"""

import json
import os
import sys
from pathlib import Path

import typer
from dotenv import load_dotenv
from openai import OpenAI
from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table
from rich import box

from orchestrator import PipelineState, run as run_pipeline

load_dotenv()

app = typer.Typer(add_completion=False)
console = Console()


@app.command()
def main(
    input: Path = typer.Option(..., "--input", "-i", help="Path to supplier data file"),
    output: Path = typer.Option(None, "--output", "-o", help="Path to write final listing JSON"),
) -> None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        console.print("[bold red]Error:[/] OPENAI_API_KEY not set. Add it to .env or export it.")
        raise typer.Exit(1)

    if not input.exists():
        console.print(f"[bold red]Error:[/] Input file not found: {input}")
        raise typer.Exit(1)

    supplier_text = input.read_text()
    client = OpenAI(api_key=api_key)

    console.print()
    console.print(Panel.fit(
        "[bold]Headout Listing Generation Pipeline[/]",
        border_style="blue",
    ))
    console.print()

    # ── Step 1: Duplicate check ──────────────────────────────────────────
    console.print("[dim][1/5][/] Checking for duplicates in local listing store...")

    # ── Step 2: Run full pipeline ─────────────────────────────────────────
    console.print("[dim][2/5][/] Running Intake Agent (OpenAI Responses API, gpt-5-mini)...")

    result = run_pipeline(supplier_text, client)

    # ── Print duplicate results ───────────────────────────────────────────
    if result.duplicates:
        console.print(Rule("Duplicate Detection", style="yellow"))
        for d in result.duplicates:
            console.print(
                f"  [yellow]⚠[/]  Possible duplicate — [bold]{d['title']}[/] "
                f"({d.get('location', '')}) · similarity {d['similarity']:.0%} · "
                f"run_id: {d['listing_id']}"
            )
    else:
        console.print("  [green]✓[/]  No duplicates found in local store")

    # ── Handle pipeline failure before intake ─────────────────────────────
    if result.state == PipelineState.INTAKE_FAILED:
        console.print(f"\n[bold red]✗ Intake Agent failed:[/] {result.error}")
        raise typer.Exit(1)

    # ── Print intake results ──────────────────────────────────────────────
    if result.intake:
        intake = result.intake
        console.print(Rule("Intake Agent", style="green"))
        console.print(
            f"  Supplier: [bold]{intake.meta.supplier}[/]  ·  "
            f"Confidence: [bold]{intake.meta.confidence.value}[/]  ·  "
            f"Publish blocked: {'[red]yes[/]' if intake.meta.publish_blocked else '[green]no[/]'}"
        )

        if intake.ambiguity_flags:
            console.print()
            console.print("  Ambiguity flags:")
            for flag in intake.ambiguity_flags:
                color = "red" if flag.blocks_publish else "yellow"
                console.print(
                    f"    [{color}]•[/{color}] [{flag.type.value}] "
                    f"[bold]{flag.field}[/] — {flag.resolution}"
                )
            if intake.meta.publish_blocked and intake.meta.publish_blocked_reasons:
                for reason in intake.meta.publish_blocked_reasons:
                    console.print(f"    [red]  ⊘  Blocks publish:[/] {reason}")

    # ── Supplier clarification email ──────────────────────────────────────
    if result.supplier_email_draft:
        console.print(Rule("Auto-drafted Supplier Clarification Email", style="cyan"))
        console.print(
            Panel(
                result.supplier_email_draft,
                border_style="cyan",
                title="[dim]This would be sent to the supplier — demo only[/]",
            )
        )

    # ── Generation blocked ────────────────────────────────────────────────
    if result.state == PipelineState.GENERATION_BLOCKED:
        console.print(f"\n[bold red]✗ Content Generator blocked:[/] {result.error}")
        raise typer.Exit(1)

    console.print(Rule("Copy Generation + Structured Data", style="green"))
    console.print("  [green]✓[/]  Content Generator complete")
    console.print("  [green]✓[/]  Template Engine complete (deterministic JSON-LD)")

    # ── Review verdict ────────────────────────────────────────────────────
    if result.review:
        rev = result.review.review
        console.print(Rule("Review Agent Verdict", style="green" if rev.overall in ("pass", "conditional_pass") else "red"))

        verdict_color = {"pass": "green", "conditional_pass": "yellow", "fail": "red"}.get(rev.overall, "white")
        console.print(f"  Overall: [bold {verdict_color}]{rev.overall.upper()}[/]")

        score_table = Table(box=box.SIMPLE, show_header=True, header_style="bold dim")
        score_table.add_column("Layer", style="dim")
        score_table.add_column("Score", justify="right")
        score_table.add_row("Factual Accuracy", f"{rev.scores.factual_accuracy}/100")
        score_table.add_row("Voice Compliance", f"{rev.scores.voice_compliance}/100")
        score_table.add_row("SEO Completeness", f"{rev.scores.seo_completeness}/100")
        console.print(score_table)

        if rev.blockers:
            console.print("  Blockers:")
            for b in rev.blockers:
                console.print(f"    [red]✗[/] [{b.id}] {b.field} — {b.found[:80]}")
                console.print(f"      [dim]Fix: {b.fix_instruction[:100]}[/]")

        if rev.warnings:
            console.print("  Warnings:")
            for w in rev.warnings:
                console.print(f"    [yellow]⚠[/] [{w.id}] {w.field} — {w.issue[:80]}")

        if rev.escalate_to_human:
            console.print(f"\n  [bold red]⚑ Escalated to human:[/] {rev.escalation_reason}")

    # ── Final state ───────────────────────────────────────────────────────
    console.print()
    if result.state == PipelineState.READY_FOR_PUBLISH:
        console.print(Panel.fit(
            f"[bold green]✓ Listing ready for publish[/]  ·  run_id: {result.run_id}",
            border_style="green",
        ))
    elif result.state == PipelineState.ESCALATED_TO_HUMAN:
        console.print(Panel.fit(
            f"[bold red]⚑ Escalated to human review[/]  ·  run_id: {result.run_id}\n"
            f"Artifacts saved to listings/{result.run_id}/",
            border_style="red",
        ))
    else:
        console.print(f"[dim]Pipeline state: {result.state.value}[/]  ·  run_id: {result.run_id}")

    # ── Write output file ─────────────────────────────────────────────────
    final_listing = result.merged_listing
    if final_listing:
        out_path = output or Path(f"listing_{result.run_id}.json")
        out_path.write_text(json.dumps(final_listing.model_dump(), indent=2, ensure_ascii=False))
        console.print(f"\n  Output saved to: [bold]{out_path}[/]")
        console.print(f"  Artifacts in:    [bold]listings/{result.run_id}/[/]")

    console.print()


if __name__ == "__main__":
    app()
