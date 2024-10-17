#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import colors from 'colors';
import { join } from 'path';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';
import { createCollectionFromDirectory } from '../../src/collection/constructors/createCollectionFromDirectory';
import { createPipelineExecutor } from '../../src/execution/00-createPipelineExecutor';
import { usageToHuman } from '../../src/execution/utils/usageToHuman';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(colors.red(`CWD must be root of the project`));
    process.exit(1);
}

playground()
    .catch((error) => {
        console.error(colors.bgRed(error.name || 'NamelessError'));
        console.error(error);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

async function playground() {
    console.info(`🧸  Playground`);

    // Do here stuff you want to test
    //========================================>

    const collection = await createCollectionFromDirectory(
        './samples/pipelines/',
        {},
        {
            isVerbose: true,
            isRecursive: false,
            isCrashedOnError: true,
        },
    );

    const pipeline = await collection.getPipelineByUrl('https://promptbook.studio/samples/simple-knowledge.ptbk.md');

    await forTime(100);

    const pipelineExecutor = createPipelineExecutor({
        pipeline,
        tools: $provideExecutionToolsForNode({ isVerbose: true }),
    });

    const inputParameters = {
        eventTitle: 'Biennial of Animation Bratislava',
        eventDescription: spaceTrim(`
            INTERNATIONAL LEADERSHIP FORUM ON ARTIFICIAL INTELLIGENCE
            Animation and A.I.: Redefining Next-Gen Media Education
            October 10, Bratislava Castle

            **Format: Empowering Youth**
            Youth and educators see the state of play in new tech, experience A.I. hands-on while peers network around media education and for future collaborations across industries.


            ## Highlights

            Industry State of Play: 6-Minute Challenge (5 leaders)
            The Reponse: Expert Panel
            Masterclass
            Tech Playground: Interactive Lab


            ## Why

            While no one expected creatives and animation to be among the first hit by A.I. emergence, they are the vanguard shaping discourse in new tech. This animation biennial summons a trend-setting group for thought leadership across industries: assessing the state of play, exploring the paths ahead and engaging youth. Convening leaders from business, governance and creative industries we forge a path into the world of tomorrow.


            ## Building on 40-Year Legacy

            Over 40 years, the Biennial of Animation has hosted over 50 world-renowed luminaries, including Oscar, Emmy and BAFTA winners, and bestowned lifetime achievement awards to leaders known in every studio worldwide.


            ##30,000 to 300,000: Bridging Professions

            This Biennial’s tech-enabled jump from 30,000 to 300,000+ attendees also sets a high standard in A.I. discourse: a flagship format uniting professions, principals and young talent held in an iconic landmark.
        `),
        rules: spaceTrim(`
            Event is not for technical people, but for children and educators
            Speak for ordinary people
        `),
    };
    const { isSuccessful, errors, warnings, outputParameters, usage } = await pipelineExecutor(
        inputParameters,
        (progress) => {
            console.info(progress.isDone ? '☑' : '☐', progress);
        },
    );

    for (const warning of warnings) {
        console.error(colors.bgYellow(warning.name /* <- 11:11 */));
        console.error(colors.yellow(warning.stack || warning.message));
    }

    for (const error of errors) {
        console.error(colors.bgRed(error.name /* <- 11:11 */));
        console.error(colors.red(error.stack || error.message));
    }

    console.info(colors.cyan(usageToHuman(usage /* <- TODO: [🌳] Compare with `llmTools.getTotalUsage()` */)));

    const { bio } = outputParameters;

    console.info(colors.gray('---'));
    console.info(colors.green(bio));
    process.exit(isSuccessful ? 0 : 1);

    //========================================/
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
