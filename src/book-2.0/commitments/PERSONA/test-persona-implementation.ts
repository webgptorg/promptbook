import { createAgentSource } from '../../agent-source/string_agent_source';
import { createAgentModelRequirementsWithCommitments } from '../_misc/createAgentModelRequirementsWithCommitments';

export async function testPersonaImplementation() {
    console.log('Testing PERSONA commitment implementation...\n');

    // Test case 1: Multiple PERSONA commitments
    const agentSourceWithMultiplePersonas = `Test Agent
PERSONA You are a helpful programming assistant with expertise in TypeScript.
PERSONA You have deep knowledge of React and modern web development.
PERSONA You always provide clear, well-documented code examples.

RULE Always explain your reasoning
RULE Use best practices`;

    console.log('=== Test Case 1: Multiple PERSONA commitments ===');
    console.log('Agent Source:');
    console.log(agentSourceWithMultiplePersonas);
    console.log('\n');

    const result1 = await createAgentModelRequirementsWithCommitments(
        createAgentSource(agentSourceWithMultiplePersonas),
    );

    console.log('Final System Message (comments removed):');
    console.log(result1.systemMessage);
    console.log('\n');

    console.log('Metadata PERSONA (original with comments):');
    console.log(result1.metadata?.PERSONA);
    console.log('\n');

    // Test case 2: Single PERSONA with other commitments that add comments
    const agentSourceWithComments = `Code Helper
PERSONA You are an expert software engineer specializing in clean code practices.

# ADDITIONAL RULES
RULE Write comprehensive tests
RULE Follow SOLID principles

# FORMATTING GUIDELINES
FORMAT Use TypeScript for all examples`;

    console.log('=== Test Case 2: PERSONA with other comment-adding commitments ===');
    console.log('Agent Source:');
    console.log(agentSourceWithComments);
    console.log('\n');

    const result2 = await createAgentModelRequirementsWithCommitments(createAgentSource(agentSourceWithComments));

    console.log('Final System Message (comments removed):');
    console.log(result2.systemMessage);
    console.log('\n');

    console.log('Metadata PERSONA:');
    console.log(result2.metadata?.PERSONA);
    console.log('\n');

    // Verify requirements
    console.log('=== Verification ===');

    // Check if multiple PERSONAs are merged
    const expectedMergedPersona = `You are a helpful programming assistant with expertise in TypeScript.
You have deep knowledge of React and modern web development.
You always provide clear, well-documented code examples.`;

    const actualPersona = result1.metadata?.PERSONA;
    console.log('✓ Multiple PERSONA commitments merged:', actualPersona === expectedMergedPersona);

    // Check if PERSONA content is stored in metadata
    console.log('✓ PERSONA content stored in metadata:', !!result1.metadata?.PERSONA);

    // Check if comments are removed from final system message
    const hasComments = result1.systemMessage.includes('#');
    console.log('✓ Comments removed from final system message:', !hasComments);

    // Check if PERSONA content appears at beginning (after comment removal)
    const startsWithPersonaContent = result1.systemMessage.startsWith('You are a helpful programming assistant');
    console.log('✓ PERSONA content at beginning of system message:', startsWithPersonaContent);
}

// Run the test if this file is executed directly
if (require.main === module) {
    testPersonaImplementation().catch(console.error);
}

/**
 * Test file to verify the PERSONA commitment implementation
 * This file demonstrates and tests the key requirements:
 * 1. Multiple PERSONA commitments are merged into one
 * 2. Content is stored in metadata.PERSONA
 * 3. PERSONA content is placed at beginning with # PERSONA marker
 * 4. Comments are removed from final system message
 */
