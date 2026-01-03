import AgentDetailView from "@/components/dashboard/agent-detail/view";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
    const { id } = await params;
    return <AgentDetailView agentId={id} />;
}
