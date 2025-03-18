"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubscription } from "@/hooks/subscriptions/index";
import { PlanGrid } from "@/components/subscriptions/PlanGrid";
import { SubscriptionBanner } from "@/components/subscriptions/SubscriptionBanner";
import { SubscriptionModals } from "@/components/subscriptions/SubscriptionModals";
import { toast } from "sonner";
import SubscriptionsContent from './SubscriptionsContent';

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SubscriptionsContent />
    </Suspense>
  );
}