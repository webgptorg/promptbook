import { notFound } from 'next/navigation';
import { BookCommitment } from '../../../../../../src/commitments/_base/BookCommitment';
import { getVisibleCommitmentDefinitions } from '../../../utils/getVisibleCommitmentDefinitions';
import { PrintButton } from '../../../components/PrintButton/PrintButton';
import { PrintHeader } from '../../../components/PrintHeader/PrintHeader';
import { DocumentationContent } from '../../../components/DocumentationContent/DocumentationContent';

type DocPageProps = {
    params: Promise<{
        docId: string;
    }>;
};

export default async function DocPage(props: DocPageProps) {
    const { docId } = await props.params;

    // Decode the docId in case it contains encoded characters (though types usually don't)
    const commitmentType = decodeURIComponent(docId) as BookCommitment;
    const groupedCommitments = getVisibleCommitmentDefinitions();
    const group = groupedCommitments.find((g) => g.primary.type === commitmentType || g.aliases.includes(commitmentType));

    if (!group) {
        notFound();
    }

    const { primary, aliases } = group;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <PrintButton />
            
            <div className="container mx-auto px-4 py-16">
                <PrintHeader title={primary.type} />
                
                <DocumentationContent 
                    primary={primary} 
                    aliases={aliases} 
                    isPrintOnly={false} 
                />
            </div>
        </div>
    );
}
