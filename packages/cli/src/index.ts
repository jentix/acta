#!/usr/bin/env node
import { actaCorePackage } from "@acta/core";

export const actaCliPackage = "@acta/cli";

export function getCliBootstrapInfo() {
  return {
    name: "acta",
    packageName: actaCliPackage,
    corePackageName: actaCorePackage,
  };
}
