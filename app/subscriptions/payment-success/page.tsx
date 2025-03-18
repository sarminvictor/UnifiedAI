"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import PaymentSuccessContent from './PaymentSuccessContent';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PaymentSuccessContent />
        </Suspense>
    );
}
