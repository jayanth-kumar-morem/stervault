import { Suspense } from 'react';
import WithdrawUI from "@/components/withdraw/withdraw-ui";

export default function WithdrawPage() {
    return (
        <Suspense fallback={<div className="container py-8 text-center">Loading...</div>}>
            <WithdrawUI />
        </Suspense>
    )
}