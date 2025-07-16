#!/usr/bin/env node
import generatorHelper from "@prisma/generator-helper";
import type { GeneratorOptions } from "@prisma/generator-helper";

const { generatorHandler } = generatorHelper;
import fs from "fs";
import path from "path";

const generate = async (options: GeneratorOptions) => {
  const { dmmf } = options;

  const outputDir = options.generator.output?.value!;
  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  const dmmfFilePath = path.join(outputDir, "dmmf.json");
  fs.writeFileSync(dmmfFilePath, JSON.stringify(dmmf, null, 2), "utf-8");
};

generatorHandler({
  onManifest: () => ({
    defaultOutput: "migrations",
    prettyName: "Prisma Database Comments",
  }),
  onGenerate: generate,
});
