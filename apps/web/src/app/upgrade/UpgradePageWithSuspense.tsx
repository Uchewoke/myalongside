"use client";


import React, { Suspense } from "react";
import UpgradePage from "./UpgradePage";

export default function UpgradePageWithSuspense() {
  return (
    <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
      <UpgradePage />
    </Suspense>
  );
}
