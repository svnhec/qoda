// Legal pages layout
export default function LegalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto py-12 px-4 max-w-4xl">
                {children}
            </div>
        </div>
    )
}
