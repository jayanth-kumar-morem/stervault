import { Suspense } from 'react';
import DepositTokensUI from "@/components/deposit-tokens/deposit-tokens-ui";

export default function DepositTokensPage() {
    return (
        <Suspense fallback={<div className="container py-8 text-center">Loading...</div>}>
            <DepositTokensUI />
        </Suspense>
    )
}