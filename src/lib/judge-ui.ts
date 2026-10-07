import chalk from "chalk";
import { input, select } from "@inquirer/prompts";
import type { Judgment, Probe, Reaction } from "./probes.js";
import { surfaceLabel } from "./surfaces.js";

/** Shows each probe and records the person's verdict and reason. Skipped probes are left out. */
export async function judgeProbes<P extends Probe>(probes: P[]): Promise<Array<Judgment & { probe: P }>> {
  const judgments: Array<Judgment & { probe: P }> = [];
  for (const [i, probe] of probes.entries()) {
    console.log(chalk.gray(`\n  ${i + 1}/${probes.length} · ${surfaceLabel(probe.surface)}`));
    console.log(`  ${chalk.white(probe.text)}\n`);
    const reaction = await select<Reaction | "skip">({
      message: "Is this us?",
      choices: [
        { name: "That's us", value: "yes" },
        { name: "Close", value: "close" },
        { name: "Not us", value: "no" },
        { name: "Skip", value: "skip" },
      ],
    });
    if (reaction === "skip") continue;
    const reason = await input({
      message: reaction === "yes" ? "Why? (optional)" : "Why?",
      validate: (v) => reaction === "yes" || v.trim().length > 0 || "A reason is what makes the judgment useful.",
    });
    judgments.push({ probe, reaction, reason: reason.trim() || null });
  }
  return judgments;
}
