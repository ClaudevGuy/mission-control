"use client";

import React from "react";
import { CodeBlock } from "@/components/shared";

const MOCK_BUILD_LOG = "";

export function BuildLogs() {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Build Logs</h3>
      <CodeBlock
        code={MOCK_BUILD_LOG}
        language="log"
        maxHeight={360}
        showCopy={true}
      />
    </div>
  );
}
