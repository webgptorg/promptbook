import { describe, expect, it } from '@jest/globals';
import { resolveDnsRecordBatchPlan, resolveDnsRecordBatchPlanForGroups } from './resolveDnsRecordBatchPlan';

describe('resolveDnsRecordBatchPlan', () => {
    it('keeps only the recommended record when the records are alternatives', () => {
        const batchPlan = resolveDnsRecordBatchPlan({
            recordSelection: 'one',
            records: [
                { type: 'A', name: 'agents.example.com', value: '203.0.113.42', note: null },
                { type: 'CNAME', name: 'agents.example.com', value: 'live.example.com', note: null },
            ],
        });

        expect(batchPlan.applicableRecords.map((record) => record.type)).toEqual(['A']);
        expect(batchPlan.excludedRecords).toEqual([
            {
                record: { type: 'CNAME', name: 'agents.example.com', value: 'live.example.com', note: null },
                reason: 'Alternative of the recommended record, configure it only instead of the recommended record.',
            },
        ]);
    });

    it('excludes records with a placeholder value which a human has to fill in', () => {
        const batchPlan = resolveDnsRecordBatchPlan({
            recordSelection: 'all',
            records: [
                { type: 'A', name: 'mail.example.com', value: '<VPS_PUBLIC_IP>', note: null },
                { type: 'MX', name: 'example.com', value: '10 mail.example.com.', note: null },
            ],
        });

        expect(batchPlan.applicableRecords.map((record) => record.type)).toEqual(['MX']);
        expect(batchPlan.excludedRecords[0]?.reason).toBe(
            'The value `<VPS_PUBLIC_IP>` is a placeholder which has to be filled in manually.',
        );
    });

    it('keeps every filled-in record when all records are required', () => {
        const batchPlan = resolveDnsRecordBatchPlan({
            recordSelection: 'all',
            records: [
                { type: 'TXT', name: 'example.com', value: 'v=spf1 mx -all', note: null },
                { type: 'TXT', name: '_dmarc.example.com', value: 'v=DMARC1; p=quarantine', note: null },
            ],
        });

        expect(batchPlan.applicableRecords).toHaveLength(2);
        expect(batchPlan.excludedRecords).toHaveLength(0);
    });
});

describe('resolveDnsRecordBatchPlanForGroups', () => {
    it('keeps the all-or-one rule of every group of one DNS manual', () => {
        const batchPlan = resolveDnsRecordBatchPlanForGroups([
            {
                recordSelection: 'one',
                records: [
                    { type: 'A', name: 'agents.example.com', value: '203.0.113.42', note: null },
                    { type: 'CNAME', name: 'agents.example.com', value: 'live.example.com', note: null },
                ],
            },
            {
                recordSelection: 'all',
                records: [
                    { type: 'MX', name: 'agents.example.com', value: '10 mail.agents.example.com.', note: null },
                    { type: 'TXT', name: 'agents.example.com', value: 'v=spf1 mx -all', note: null },
                ],
            },
        ]);

        expect(batchPlan.applicableRecords.map((record) => record.type)).toEqual(['A', 'MX', 'TXT']);
        expect(batchPlan.excludedRecords.map((excludedRecord) => excludedRecord.record.type)).toEqual(['CNAME']);
    });

    it('writes a record shared by more groups only once', () => {
        const batchPlan = resolveDnsRecordBatchPlanForGroups([
            {
                recordSelection: 'all',
                records: [{ type: 'A', name: 'Agents.example.com', value: '203.0.113.42', note: null }],
            },
            {
                recordSelection: 'all',
                records: [{ type: 'a', name: 'agents.example.com', value: '203.0.113.42', note: 'Same record.' }],
            },
        ]);

        expect(batchPlan.applicableRecords).toHaveLength(1);
    });
});
