import { Suspense } from 'react';
import BorrowUI from "@/components/borrow/borrow-ui";

export default function BorrowPage() {
    return (
        <Suspense fallback={<div className="container py-8 text-center">Loading...</div>}>
            <BorrowUI />
        </Suspense>
    )
}