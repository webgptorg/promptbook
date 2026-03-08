import type { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { createWalletSystemMessage } from './createWalletSystemMessage';
import { createWalletToolFunctions } from './createWalletToolFunctions';
import { createWalletTools } from './createWalletTools';
import { getWalletCommitmentDocumentation } from './getWalletCommitmentDocumentation';
import { getWalletToolTitles } from './getWalletToolTitles';

export { setWalletToolRuntimeAdapter } from './setWalletToolRuntimeAdapter';
export type {
    WalletRecordType,
    WalletToolRecord,
    WalletToolRuntimeAdapter,
    WalletToolRuntimeContext,
} from './WalletToolRuntimeAdapter';

/**
 * WALLET commitment definition.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class WalletCommitmentDefinition extends BaseCommitmentDefinition<'WALLET' | 'WALLETS'> {
    public constructor(type: 'WALLET' | 'WALLETS' = 'WALLET') {
        super(type);
    }

    override get requiresContent(): boolean {
        return false;
    }

    get description(): string {
        return 'Enable persistent private credential storage (tokens, logins, cookies) scoped per agent or globally.';
    }

    get icon(): string {
        return '👛';
    }

    get documentation(): string {
        return getWalletCommitmentDocumentation(this.type);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const extraInstructions = formatOptionalInstructionBlock('Wallet instructions', content);

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: createWalletTools(requirements.tools),
                _metadata: {
                    ...requirements._metadata,
                    useWallet: content || true,
                },
            },
            createWalletSystemMessage(extraInstructions),
        );
    }

    getToolTitles(): Record<string_javascript_name, string> {
        return getWalletToolTitles();
    }

    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return createWalletToolFunctions();
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
