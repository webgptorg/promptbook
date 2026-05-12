[ ]

[✨✒️] Fix publishing new version of Promptbook to Docker

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.

**Log from Github Actions:**

```log
2026-05-12T15:23:44.3713614Z Current runner version: '2.334.0'
2026-05-12T15:23:44.3737616Z ##[group]Runner Image Provisioner
2026-05-12T15:23:44.3738418Z Hosted Compute Agent
2026-05-12T15:23:44.3738918Z Version: 20260213.493
2026-05-12T15:23:44.3739475Z Commit: 5c115507f6dd24b8de37d8bbe0bb4509d0cc0fa3
2026-05-12T15:23:44.3740135Z Build Date: 2026-02-13T00:28:41Z
2026-05-12T15:23:44.3740741Z Worker ID: {5f3c5532-bb10-48b3-95fa-9355115f803c}
2026-05-12T15:23:44.3741349Z Azure Region: westcentralus
2026-05-12T15:23:44.3741897Z ##[endgroup]
2026-05-12T15:23:44.3743216Z ##[group]Operating System
2026-05-12T15:23:44.3743782Z Ubuntu
2026-05-12T15:23:44.3744179Z 24.04.4
2026-05-12T15:23:44.3744603Z LTS
2026-05-12T15:23:44.3745049Z ##[endgroup]
2026-05-12T15:23:44.3745496Z ##[group]Runner Image
2026-05-12T15:23:44.3746002Z Image: ubuntu-24.04
2026-05-12T15:23:44.3746496Z Version: 20260413.86.1
2026-05-12T15:23:44.3747723Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20260413.86/images/ubuntu/Ubuntu2404-Readme.md
2026-05-12T15:23:44.3749081Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20260413.86
2026-05-12T15:23:44.3749870Z ##[endgroup]
2026-05-12T15:23:44.3750861Z ##[group]GITHUB_TOKEN Permissions
2026-05-12T15:23:44.3752866Z Contents: read
2026-05-12T15:23:44.3753364Z Metadata: read
2026-05-12T15:23:44.3753908Z Packages: read
2026-05-12T15:23:44.3754340Z ##[endgroup]
2026-05-12T15:23:44.3756724Z Secret source: Actions
2026-05-12T15:23:44.3757789Z Prepare workflow directory
2026-05-12T15:23:44.4088253Z Prepare all required actions
2026-05-12T15:23:44.4127209Z Getting action download info
2026-05-12T15:23:44.8988415Z Download action repository 'actions/checkout@v4' (SHA:34e114876b0b11c390a56381ad16ebd13914f8d5)
2026-05-12T15:23:45.0125183Z Download action repository 'docker/login-action@v2' (SHA:465a07811f14bebb1938fbed4728c6a1ff8901fc)
2026-05-12T15:23:45.6399958Z Download action repository 'actions/setup-node@v4' (SHA:49933ea5288caeca8642d1e84afbd3f7d6820020)
2026-05-12T15:23:45.7104052Z Download action repository 'docker/build-push-action@v2' (SHA:ac9327eae2b366085ac7f6a2d02df8aa8ead720a)
2026-05-12T15:23:46.2188904Z Download action repository 'peter-evans/dockerhub-description@v5' (SHA:1b9a80c056b620d92cedb9d9b5a223409c68ddfa)
2026-05-12T15:23:46.6967850Z Complete job name: Publish Docker image to DockerHub
2026-05-12T15:23:46.7879627Z ##[group]Run actions/checkout@v4
2026-05-12T15:23:46.7880821Z with:
2026-05-12T15:23:46.7881581Z   repository: webgptorg/promptbook
2026-05-12T15:23:46.7882832Z   token: ***
2026-05-12T15:23:46.7883545Z   ssh-strict: true
2026-05-12T15:23:46.7884303Z   ssh-user: git
2026-05-12T15:23:46.7885049Z   persist-credentials: true
2026-05-12T15:23:46.7885874Z   clean: true
2026-05-12T15:23:46.7886763Z   sparse-checkout-cone-mode: true
2026-05-12T15:23:46.7887672Z   fetch-depth: 1
2026-05-12T15:23:46.7888405Z   fetch-tags: false
2026-05-12T15:23:46.7889160Z   show-progress: true
2026-05-12T15:23:46.7889913Z   lfs: false
2026-05-12T15:23:46.7890617Z   submodules: false
2026-05-12T15:23:46.7891408Z   set-safe-directory: true
2026-05-12T15:23:46.7892447Z ##[endgroup]
2026-05-12T15:23:46.8967543Z Syncing repository: webgptorg/promptbook
2026-05-12T15:23:46.8970129Z ##[group]Getting Git version info
2026-05-12T15:23:46.8971445Z Working directory is '/home/runner/work/promptbook/promptbook'
2026-05-12T15:23:46.8974311Z [command]/usr/bin/git version
2026-05-12T15:23:46.8993638Z git version 2.53.0
2026-05-12T15:23:46.9016682Z ##[endgroup]
2026-05-12T15:23:46.9030274Z Temporarily overriding HOME='/home/runner/work/_temp/eba31216-9877-4d58-aadf-650c1039908b' before making global git config changes
2026-05-12T15:23:46.9032889Z Adding repository directory to the temporary git global config as a safe directory
2026-05-12T15:23:46.9035255Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/promptbook/promptbook
2026-05-12T15:23:46.9063308Z Deleting the contents of '/home/runner/work/promptbook/promptbook'
2026-05-12T15:23:46.9065737Z ##[group]Initializing the repository
2026-05-12T15:23:46.9070906Z [command]/usr/bin/git init /home/runner/work/promptbook/promptbook
2026-05-12T15:23:46.9143486Z hint: Using 'master' as the name for the initial branch. This default branch name
2026-05-12T15:23:46.9146285Z hint: will change to "main" in Git 3.0. To configure the initial branch name
2026-05-12T15:23:46.9149263Z hint: to use in all of your new repositories, which will suppress this warning,
2026-05-12T15:23:46.9151386Z hint: call:
2026-05-12T15:23:46.9152464Z hint:
2026-05-12T15:23:46.9153834Z hint: 	git config --global init.defaultBranch <name>
2026-05-12T15:23:46.9155457Z hint:
2026-05-12T15:23:46.9157201Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2026-05-12T15:23:46.9159952Z hint: 'development'. The just-created branch can be renamed via this command:
2026-05-12T15:23:46.9162076Z hint:
2026-05-12T15:23:46.9163318Z hint: 	git branch -m <name>
2026-05-12T15:23:46.9164135Z hint:
2026-05-12T15:23:46.9165192Z hint: Disable this message with "git config set advice.defaultBranchName false"
2026-05-12T15:23:46.9167301Z Initialized empty Git repository in /home/runner/work/promptbook/promptbook/.git/
2026-05-12T15:23:46.9172053Z [command]/usr/bin/git remote add origin https://github.com/webgptorg/promptbook
2026-05-12T15:23:46.9186140Z ##[endgroup]
2026-05-12T15:23:46.9188443Z ##[group]Disabling automatic garbage collection
2026-05-12T15:23:46.9190349Z [command]/usr/bin/git config --local gc.auto 0
2026-05-12T15:23:46.9215210Z ##[endgroup]
2026-05-12T15:23:46.9217396Z ##[group]Setting up auth
2026-05-12T15:23:46.9223311Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2026-05-12T15:23:46.9251137Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2026-05-12T15:23:46.9485799Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2026-05-12T15:23:46.9515434Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2026-05-12T15:23:46.9689191Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
2026-05-12T15:23:46.9724553Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
2026-05-12T15:23:46.9899977Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2026-05-12T15:23:46.9929085Z ##[endgroup]
2026-05-12T15:23:46.9931166Z ##[group]Fetching the repository
2026-05-12T15:23:46.9939968Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +c9ef11e7a27a322caaa7cce66a358658b2f808e5:refs/tags/v0.112.0-65
2026-05-12T15:24:10.2345675Z From https://github.com/webgptorg/promptbook
2026-05-12T15:24:10.2348789Z  * [new ref]         c9ef11e7a27a322caaa7cce66a358658b2f808e5 -> v0.112.0-65
2026-05-12T15:24:10.2369373Z ##[endgroup]
2026-05-12T15:24:10.2369937Z ##[group]Determining the checkout info
2026-05-12T15:24:10.2370913Z ##[endgroup]
2026-05-12T15:24:10.2377750Z [command]/usr/bin/git sparse-checkout disable
2026-05-12T15:24:10.2411170Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2026-05-12T15:24:10.2435870Z ##[group]Checking out the ref
2026-05-12T15:24:10.2439825Z [command]/usr/bin/git checkout --progress --force refs/tags/v0.112.0-65
2026-05-12T15:24:11.2524698Z Updating files:  49% (3671/7354)
2026-05-12T15:24:11.2540852Z Updating files:  50% (3677/7354)
2026-05-12T15:24:11.2567622Z Updating files:  51% (3751/7354)
2026-05-12T15:24:11.2589293Z Updating files:  52% (3825/7354)
2026-05-12T15:24:11.2619220Z Updating files:  53% (3898/7354)
2026-05-12T15:24:11.2640738Z Updating files:  54% (3972/7354)
2026-05-12T15:24:11.2664513Z Updating files:  55% (4045/7354)
2026-05-12T15:24:11.2711872Z Updating files:  56% (4119/7354)
2026-05-12T15:24:11.2736014Z Updating files:  57% (4192/7354)
2026-05-12T15:24:11.2757803Z Updating files:  58% (4266/7354)
2026-05-12T15:24:11.2778007Z Updating files:  59% (4339/7354)
2026-05-12T15:24:11.4987321Z Updating files:  60% (4413/7354)
2026-05-12T15:24:11.8069832Z Updating files:  61% (4486/7354)
2026-05-12T15:24:12.0588407Z Updating files:  62% (4560/7354)
2026-05-12T15:24:12.2358700Z Updating files:  63% (4634/7354)
2026-05-12T15:24:12.2534258Z Updating files:  64% (4707/7354)
2026-05-12T15:24:12.3949875Z Updating files:  64% (4716/7354)
2026-05-12T15:24:12.5864459Z Updating files:  65% (4781/7354)
2026-05-12T15:24:12.7401171Z Updating files:  66% (4854/7354)
2026-05-12T15:24:12.8484319Z Updating files:  67% (4928/7354)
2026-05-12T15:24:12.9233492Z Updating files:  68% (5001/7354)
2026-05-12T15:24:13.0888628Z Updating files:  69% (5075/7354)
2026-05-12T15:24:13.0913956Z Updating files:  70% (5148/7354)
2026-05-12T15:24:13.0935199Z Updating files:  71% (5222/7354)
2026-05-12T15:24:13.0963876Z Updating files:  72% (5295/7354)
2026-05-12T15:24:13.0992552Z Updating files:  73% (5369/7354)
2026-05-12T15:24:13.1018587Z Updating files:  74% (5442/7354)
2026-05-12T15:24:13.1041867Z Updating files:  75% (5516/7354)
2026-05-12T15:24:13.1086317Z Updating files:  76% (5590/7354)
2026-05-12T15:24:13.1116725Z Updating files:  77% (5663/7354)
2026-05-12T15:24:13.1140670Z Updating files:  78% (5737/7354)
2026-05-12T15:24:13.1161577Z Updating files:  79% (5810/7354)
2026-05-12T15:24:13.1188782Z Updating files:  80% (5884/7354)
2026-05-12T15:24:13.1211710Z Updating files:  81% (5957/7354)
2026-05-12T15:24:13.1241630Z Updating files:  82% (6031/7354)
2026-05-12T15:24:13.1264621Z Updating files:  83% (6104/7354)
2026-05-12T15:24:13.1285629Z Updating files:  84% (6178/7354)
2026-05-12T15:24:13.1305996Z Updating files:  85% (6251/7354)
2026-05-12T15:24:13.1328262Z Updating files:  86% (6325/7354)
2026-05-12T15:24:13.1357415Z Updating files:  87% (6398/7354)
2026-05-12T15:24:13.1443287Z Updating files:  88% (6472/7354)
2026-05-12T15:24:13.1464942Z Updating files:  89% (6546/7354)
2026-05-12T15:24:13.1494644Z Updating files:  90% (6619/7354)
2026-05-12T15:24:13.1528373Z Updating files:  91% (6693/7354)
2026-05-12T15:24:13.1563593Z Updating files:  92% (6766/7354)
2026-05-12T15:24:13.1587784Z Updating files:  93% (6840/7354)
2026-05-12T15:24:13.1604345Z Updating files:  94% (6913/7354)
2026-05-12T15:24:13.1624928Z Updating files:  95% (6987/7354)
2026-05-12T15:24:13.1645615Z Updating files:  96% (7060/7354)
2026-05-12T15:24:13.1666687Z Updating files:  97% (7134/7354)
2026-05-12T15:24:13.1718301Z Updating files:  98% (7207/7354)
2026-05-12T15:24:13.1739741Z Updating files:  99% (7281/7354)
2026-05-12T15:24:13.1740096Z Updating files: 100% (7354/7354)
2026-05-12T15:24:13.1740512Z Updating files: 100% (7354/7354), done.
2026-05-12T15:24:13.1832663Z Note: switching to 'refs/tags/v0.112.0-65'.
2026-05-12T15:24:13.1833083Z 
2026-05-12T15:24:13.1833350Z You are in 'detached HEAD' state. You can look around, make experimental
2026-05-12T15:24:13.1833809Z changes and commit them, and you can discard any commits you make in this
2026-05-12T15:24:13.1834315Z state without impacting any branches by switching back to a branch.
2026-05-12T15:24:13.1834628Z 
2026-05-12T15:24:13.1834812Z If you want to create a new branch to retain commits you create, you may
2026-05-12T15:24:13.1835208Z do so (now or later) by using -c with the switch command. Example:
2026-05-12T15:24:13.1835426Z 
2026-05-12T15:24:13.1835519Z   git switch -c <new-branch-name>
2026-05-12T15:24:13.1835675Z 
2026-05-12T15:24:13.1835764Z Or undo this operation with:
2026-05-12T15:24:13.1835901Z 
2026-05-12T15:24:13.1835982Z   git switch -
2026-05-12T15:24:13.1836088Z 
2026-05-12T15:24:13.1836284Z Turn off this advice by setting config variable advice.detachedHead to false
2026-05-12T15:24:13.1836661Z 
2026-05-12T15:24:13.1836798Z HEAD is now at c9ef11e 0.112.0-65
2026-05-12T15:24:13.1950719Z ##[endgroup]
2026-05-12T15:24:13.1982636Z [command]/usr/bin/git log -1 --format=%H
2026-05-12T15:24:13.2002246Z c9ef11e7a27a322caaa7cce66a358658b2f808e5
2026-05-12T15:24:13.2171213Z ##[group]Run docker/login-action@v2
2026-05-12T15:24:13.2171467Z with:
2026-05-12T15:24:13.2171798Z   username: ***
2026-05-12T15:24:13.2172046Z   password: ***
2026-05-12T15:24:13.2172212Z   ecr: auto
2026-05-12T15:24:13.2172384Z   logout: true
2026-05-12T15:24:13.2172562Z ##[endgroup]
2026-05-12T15:24:13.3063138Z Logging into Docker Hub...
2026-05-12T15:24:13.7613835Z Login Succeeded!
2026-05-12T15:24:13.7724516Z ##[group]Run actions/setup-node@v4
2026-05-12T15:24:13.7724768Z with:
2026-05-12T15:24:13.7724940Z   node-version: 22
2026-05-12T15:24:13.7725160Z   registry-url: https://registry.npmjs.org/
2026-05-12T15:24:13.7725433Z   always-auth: false
2026-05-12T15:24:13.7725622Z   check-latest: false
2026-05-12T15:24:13.7725936Z   token: ***
2026-05-12T15:24:13.7726108Z ##[endgroup]
2026-05-12T15:24:13.9430298Z Found in cache @ /opt/hostedtoolcache/node/22.22.2/x64
2026-05-12T15:24:13.9436940Z ##[group]Environment details
2026-05-12T15:24:14.2905584Z node: v22.22.2
2026-05-12T15:24:14.2905923Z npm: 10.9.7
2026-05-12T15:24:14.2906179Z yarn: 1.22.22
2026-05-12T15:24:14.2907035Z ##[endgroup]
2026-05-12T15:24:14.3006026Z ##[group]Run git submodule update --init --recursive
2026-05-12T15:24:14.3006458Z [36;1mgit submodule update --init --recursive[0m
2026-05-12T15:24:14.3030787Z shell: /usr/bin/bash -e {0}
2026-05-12T15:24:14.3031038Z env:
2026-05-12T15:24:14.3031283Z   NPM_CONFIG_USERCONFIG: /home/runner/work/_temp/.npmrc
2026-05-12T15:24:14.3031591Z   NODE_AUTH_TOKEN: XXXXX-XXXXX-XXXXX-XXXXX
2026-05-12T15:24:14.3031845Z ##[endgroup]
2026-05-12T15:24:14.3263464Z Submodule 'book' (https://github.com/webgptorg/book) registered for path 'book'
2026-05-12T15:24:14.3278651Z Cloning into '/home/runner/work/promptbook/promptbook/book'...
2026-05-12T15:24:17.0740129Z Submodule path 'book': checked out '3d01f717efb1fb7088e9c1ca1c21c0d078659d0c'
2026-05-12T15:24:17.0780739Z ##[group]Run echo "VERSION=$(node -p 'require(`./package.json`).version')" >> $GITHUB_ENV
2026-05-12T15:24:17.0781283Z [36;1mecho "VERSION=$(node -p 'require(`./package.json`).version')" >> $GITHUB_ENV[0m
2026-05-12T15:24:17.0794179Z shell: /usr/bin/bash -e {0}
2026-05-12T15:24:17.0794409Z env:
2026-05-12T15:24:17.0794639Z   NPM_CONFIG_USERCONFIG: /home/runner/work/_temp/.npmrc
2026-05-12T15:24:17.0794948Z   NODE_AUTH_TOKEN: XXXXX-XXXXX-XXXXX-XXXXX
2026-05-12T15:24:17.0795195Z ##[endgroup]
2026-05-12T15:24:17.1103852Z ##[group]Run echo $VERSION
2026-05-12T15:24:17.1104105Z [36;1mecho $VERSION[0m
2026-05-12T15:24:17.1116814Z shell: /usr/bin/bash -e {0}
2026-05-12T15:24:17.1117041Z env:
2026-05-12T15:24:17.1117282Z   NPM_CONFIG_USERCONFIG: /home/runner/work/_temp/.npmrc
2026-05-12T15:24:17.1117596Z   NODE_AUTH_TOKEN: XXXXX-XXXXX-XXXXX-XXXXX
2026-05-12T15:24:17.1117844Z   VERSION: 0.112.0-65
2026-05-12T15:24:17.1118032Z ##[endgroup]
2026-05-12T15:24:17.1150516Z 0.112.0-65
2026-05-12T15:24:17.1173291Z ##[group]Run cat Dockerfile
2026-05-12T15:24:17.1173572Z [36;1mcat Dockerfile[0m
2026-05-12T15:24:17.1185534Z shell: /usr/bin/bash -e {0}
2026-05-12T15:24:17.1185774Z env:
2026-05-12T15:24:17.1186012Z   NPM_CONFIG_USERCONFIG: /home/runner/work/_temp/.npmrc
2026-05-12T15:24:17.1186323Z   NODE_AUTH_TOKEN: XXXXX-XXXXX-XXXXX-XXXXX
2026-05-12T15:24:17.1186836Z   VERSION: 0.112.0-65
2026-05-12T15:24:17.1187027Z ##[endgroup]
2026-05-12T15:24:17.1225899Z # [🐋] Dockerfile
2026-05-12T15:24:17.1226132Z 
2026-05-12T15:24:17.1226323Z FROM node:22-slim
2026-05-12T15:24:17.1226680Z 
2026-05-12T15:24:17.1226833Z WORKDIR /usr/app
2026-05-12T15:24:17.1227027Z 
2026-05-12T15:24:17.1227303Z COPY package.json package-lock.json ./
2026-05-12T15:24:17.1227737Z RUN npm ci
2026-05-12T15:24:17.1227890Z 
2026-05-12T15:24:17.1228022Z COPY . .
2026-05-12T15:24:17.1228203Z 
2026-05-12T15:24:17.1228610Z # DockerHub should publish the production Agents Server by default.
2026-05-12T15:24:17.1229414Z ENV NEXT_PUBLIC_SITE_URL=http://localhost:4440
2026-05-12T15:24:17.1230026Z RUN npm run build --prefix apps/agents-server
2026-05-12T15:24:17.1230345Z 
2026-05-12T15:24:17.1230487Z WORKDIR /usr/app/apps/agents-server
2026-05-12T15:24:17.1230656Z 
2026-05-12T15:24:17.1230764Z ENV NODE_ENV=production
2026-05-12T15:24:17.1230904Z 
2026-05-12T15:24:17.1230981Z EXPOSE 4440
2026-05-12T15:24:17.1231092Z 
2026-05-12T15:24:17.1231203Z CMD ["npm", "run", "start"]
2026-05-12T15:24:17.1231337Z 
2026-05-12T15:24:17.1231682Z # TODO: [🚑] This file should be meybe in `/packages/docker/...`
2026-05-12T15:24:17.1231984Z # TODO:
2026-05-12T15:24:17.1307401Z ##[group]Run docker/build-push-action@v2
2026-05-12T15:24:17.1307667Z with:
2026-05-12T15:24:17.1307838Z   context: .
2026-05-12T15:24:17.1308002Z   push: true
2026-05-12T15:24:17.1308238Z   tags: ***/promptbook:0.112.0-65
2026-05-12T15:24:17.1308464Z   load: false
2026-05-12T15:24:17.1308625Z   no-cache: false
2026-05-12T15:24:17.1308812Z   pull: false
2026-05-12T15:24:17.1309110Z   github-token: ***
2026-05-12T15:24:17.1309304Z env:
2026-05-12T15:24:17.1309515Z   NPM_CONFIG_USERCONFIG: /home/runner/work/_temp/.npmrc
2026-05-12T15:24:17.1309820Z   NODE_AUTH_TOKEN: XXXXX-XXXXX-XXXXX-XXXXX
2026-05-12T15:24:17.1310064Z   VERSION: 0.112.0-65
2026-05-12T15:24:17.1310239Z ##[endgroup]
2026-05-12T15:24:17.2194013Z ##[warning]The `save-state` command is deprecated and will be disabled soon. Please upgrade to using Environment Files. For more information see: https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/
2026-05-12T15:24:17.2203095Z ##[group]Docker info
2026-05-12T15:24:17.2233235Z [command]/usr/bin/docker version
2026-05-12T15:24:17.2408921Z Client: Docker Engine - Community
2026-05-12T15:24:17.2409255Z  Version:           28.0.4
2026-05-12T15:24:17.2409491Z  API version:       1.48
2026-05-12T15:24:17.2409776Z  Go version:        go1.23.7
2026-05-12T15:24:17.2410007Z  Git commit:        b8034c0
2026-05-12T15:24:17.2410275Z  Built:             Tue Mar 25 15:07:16 2025
2026-05-12T15:24:17.2410574Z  OS/Arch:           linux/amd64
2026-05-12T15:24:17.2410800Z  Context:           default
2026-05-12T15:24:17.2410943Z 
2026-05-12T15:24:17.2411077Z Server: Docker Engine - Community
2026-05-12T15:24:17.2411311Z  Engine:
2026-05-12T15:24:17.2411490Z   Version:          28.0.4
2026-05-12T15:24:17.2411818Z   API version:      1.48 (minimum version 1.24)
2026-05-12T15:24:17.2412087Z   Go version:       go1.23.7
2026-05-12T15:24:17.2412317Z   Git commit:       6430e49
2026-05-12T15:24:17.2412570Z   Built:            Tue Mar 25 15:07:16 2025
2026-05-12T15:24:17.2412857Z   OS/Arch:          linux/amd64
2026-05-12T15:24:17.2413091Z   Experimental:     false
2026-05-12T15:24:17.2413321Z  containerd:
2026-05-12T15:24:17.2413503Z   Version:          v2.2.2
2026-05-12T15:24:17.2413813Z   GitCommit:        301b2dac98f15c27117da5c8af12118a041a31d9
2026-05-12T15:24:17.2414101Z  runc:
2026-05-12T15:24:17.2414278Z   Version:          1.3.4
2026-05-12T15:24:17.2414506Z   GitCommit:        v1.3.4-0-gd6d73eb8
2026-05-12T15:24:17.2414748Z  docker-init:
2026-05-12T15:24:17.2414937Z   Version:          0.19.0
2026-05-12T15:24:17.2415155Z   GitCommit:        de40ad0
2026-05-12T15:24:17.2442633Z [command]/usr/bin/docker info
2026-05-12T15:24:17.9434163Z Client: Docker Engine - Community
2026-05-12T15:24:17.9434748Z  Version:    28.0.4
2026-05-12T15:24:17.9435315Z  Context:    default
2026-05-12T15:24:17.9435669Z  Debug Mode: false
2026-05-12T15:24:17.9435944Z  Plugins:
2026-05-12T15:24:17.9436248Z   buildx: Docker Buildx (Docker Inc.)
2026-05-12T15:24:17.9436843Z     Version:  v0.33.0
2026-05-12T15:24:17.9437305Z     Path:     /usr/libexec/docker/cli-plugins/docker-buildx
2026-05-12T15:24:17.9437783Z   compose: Docker Compose (Docker Inc.)
2026-05-12T15:24:17.9438136Z     Version:  v2.38.2
2026-05-12T15:24:17.9438541Z     Path:     /usr/libexec/docker/cli-plugins/docker-compose
2026-05-12T15:24:17.9438844Z 
2026-05-12T15:24:17.9438958Z Server:
2026-05-12T15:24:17.9439195Z  Containers: 0
2026-05-12T15:24:17.9439912Z   Running: 0
2026-05-12T15:24:17.9440202Z   Paused: 0
2026-05-12T15:24:17.9440488Z   Stopped: 0
2026-05-12T15:24:17.9440745Z  Images: 6
2026-05-12T15:24:17.9441011Z  Server Version: 28.0.4
2026-05-12T15:24:17.9441342Z  Storage Driver: overlay2
2026-05-12T15:24:17.9441677Z   Backing Filesystem: extfs
2026-05-12T15:24:17.9442026Z   Supports d_type: true
2026-05-12T15:24:17.9442343Z   Using metacopy: false
2026-05-12T15:24:17.9442664Z   Native Overlay Diff: false
2026-05-12T15:24:17.9443039Z   userxattr: false
2026-05-12T15:24:17.9443392Z  Logging Driver: json-file
2026-05-12T15:24:17.9443871Z  Cgroup Driver: systemd
2026-05-12T15:24:17.9444087Z  Cgroup Version: 2
2026-05-12T15:24:17.9444287Z  Plugins:
2026-05-12T15:24:17.9444487Z   Volume: local
2026-05-12T15:24:17.9445017Z   Network: bridge host ipvlan macvlan null overlay
2026-05-12T15:24:17.9445669Z   Log: awslogs fluentd gcplogs gelf journald json-file local splunk syslog
2026-05-12T15:24:17.9446224Z  Swarm: inactive
2026-05-12T15:24:17.9446872Z  Runtimes: io.containerd.runc.v2 runc
2026-05-12T15:24:17.9447305Z  Default Runtime: runc
2026-05-12T15:24:17.9447825Z  Init Binary: docker-init
2026-05-12T15:24:17.9448369Z  containerd version: 301b2dac98f15c27117da5c8af12118a041a31d9
2026-05-12T15:24:17.9448925Z  runc version: v1.3.4-0-gd6d73eb8
2026-05-12T15:24:17.9449313Z  init version: de40ad0
2026-05-12T15:24:17.9449643Z  Security Options:
2026-05-12T15:24:17.9449932Z   apparmor
2026-05-12T15:24:17.9450179Z   seccomp
2026-05-12T15:24:17.9450438Z    Profile: builtin
2026-05-12T15:24:17.9450720Z   cgroupns
2026-05-12T15:24:17.9451060Z  Kernel Version: 6.17.0-1010-azure
2026-05-12T15:24:17.9451486Z  Operating System: Ubuntu 24.04.4 LTS
2026-05-12T15:24:17.9451872Z  OSType: linux
2026-05-12T15:24:17.9452156Z  Architecture: x86_64
2026-05-12T15:24:17.9452482Z  CPUs: 4
2026-05-12T15:24:17.9452784Z  Total Memory: 15.61GiB
2026-05-12T15:24:17.9453132Z  Name: runnervmeorf1
2026-05-12T15:24:17.9453535Z  ID: e27c7740-8587-4822-9bec-fa47c65630a3
2026-05-12T15:24:17.9454018Z  Docker Root Dir: /var/lib/docker
2026-05-12T15:24:17.9454419Z  Debug Mode: false
2026-05-12T15:24:17.9454889Z  Username: ***
2026-05-12T15:24:17.9455236Z  Experimental: false
2026-05-12T15:24:17.9455604Z  Insecure Registries:
2026-05-12T15:24:17.9456005Z   ::1/128
2026-05-12T15:24:17.9456304Z   127.0.0.0/8
2026-05-12T15:24:17.9456809Z  Live Restore Enabled: false
2026-05-12T15:24:17.9457064Z 
2026-05-12T15:24:17.9457694Z ##[endgroup]
2026-05-12T15:24:17.9956348Z ##[warning]The `save-state` command is deprecated and will be disabled soon. Please upgrade to using Environment Files. For more information see: https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/
2026-05-12T15:24:18.0539904Z [command]/usr/bin/docker buildx build --iidfile /tmp/docker-build-push-VrwzOI/iidfile --tag ***/promptbook:0.112.0-65 --metadata-file /tmp/docker-build-push-VrwzOI/metadata-file --push .
2026-05-12T15:24:18.3023762Z #0 building with "default" instance using docker driver
2026-05-12T15:24:18.3024166Z 
2026-05-12T15:24:18.3024434Z #1 [internal] load build definition from Dockerfile
2026-05-12T15:24:18.3024919Z #1 transferring dockerfile: 499B done
2026-05-12T15:24:18.3025265Z #1 DONE 0.0s
2026-05-12T15:24:18.3025417Z 
2026-05-12T15:24:18.3025746Z #2 [internal] load metadata for docker.io/library/node:22-slim
2026-05-12T15:24:18.4558941Z #2 ...
2026-05-12T15:24:18.4559165Z 
2026-05-12T15:24:18.4559425Z #3 [auth] library/node:pull token for registry-1.docker.io
2026-05-12T15:24:18.4559766Z #3 DONE 0.0s
2026-05-12T15:24:18.6061686Z 
2026-05-12T15:24:18.6062347Z #2 [internal] load metadata for docker.io/library/node:22-slim
2026-05-12T15:24:19.0450863Z #2 DONE 0.9s
2026-05-12T15:24:19.1624787Z 
2026-05-12T15:24:19.1625941Z #4 [internal] load .dockerignore
2026-05-12T15:24:19.1627340Z #4 transferring context: 216B done
2026-05-12T15:24:19.1630072Z #4 DONE 0.0s
2026-05-12T15:24:19.1630426Z 
2026-05-12T15:24:19.1631228Z #5 [1/7] FROM docker.io/library/node:22-slim@sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e
2026-05-12T15:24:19.1643983Z #5 resolve docker.io/library/node:22-slim@sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e done
2026-05-12T15:24:19.1645067Z #5 sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e 6.49kB / 6.49kB done
2026-05-12T15:24:19.1646169Z #5 sha256:868499d55378719bffa87b0ed1f099591823c029b543043c09c2483468e93201 1.93kB / 1.93kB done
2026-05-12T15:24:19.1647413Z #5 sha256:341b84210b3300ec9d6e0f0bcf477b1714b802209b5a4ca475e2077ffc07511d 6.88kB / 6.88kB done
2026-05-12T15:24:19.1648865Z #5 sha256:9b02e9fcb40102eae20d9d1fc7594b44328f4a3eb9b8a3bdb7db283d10840a30 0B / 28.24MB 0.1s
2026-05-12T15:24:19.1650136Z #5 sha256:5d4a3aa5a9ad18507bf18000f0280556365b57788f03aca635c4792a79799082 0B / 3.32kB 0.1s
2026-05-12T15:24:19.1651369Z #5 sha256:22c736fe2dee42f2274e133f0fd657bc3a2661f48b034a8adc2ba40bb6fa4b82 0B / 49.84MB 0.1s
2026-05-12T15:24:19.3655821Z #5 sha256:5d4a3aa5a9ad18507bf18000f0280556365b57788f03aca635c4792a79799082 3.32kB / 3.32kB 0.3s done
2026-05-12T15:24:19.3659354Z #5 sha256:dad35d9305371ac05c2bdf6de63217e78a5906a5f0335bd26432bbee187aea33 0B / 1.71MB 0.3s
2026-05-12T15:24:19.5627794Z #5 sha256:9b02e9fcb40102eae20d9d1fc7594b44328f4a3eb9b8a3bdb7db283d10840a30 11.53MB / 28.24MB 0.5s
2026-05-12T15:24:19.5629948Z #5 sha256:22c736fe2dee42f2274e133f0fd657bc3a2661f48b034a8adc2ba40bb6fa4b82 5.24MB / 49.84MB 0.5s
2026-05-12T15:24:19.6623489Z #5 sha256:9b02e9fcb40102eae20d9d1fc7594b44328f4a3eb9b8a3bdb7db283d10840a30 14.68MB / 28.24MB 0.6s
2026-05-12T15:24:19.6624540Z #5 sha256:22c736fe2dee42f2274e133f0fd657bc3a2661f48b034a8adc2ba40bb6fa4b82 14.68MB / 49.84MB 0.6s
2026-05-12T15:24:19.6625581Z #5 sha256:dad35d9305371ac05c2bdf6de63217e78a5906a5f0335bd26432bbee187aea33 1.71MB / 1.71MB 0.6s done
2026-05-12T15:24:19.6626383Z #5 sha256:079e3008b73419a93cb985863971162eb59bcb78e57f6ef558fc198ad2848d89 0B / 450B 0.6s
2026-05-12T15:24:19.7629551Z #5 sha256:9b02e9fcb40102eae20d9d1fc7594b44328f4a3eb9b8a3bdb7db283d10840a30 17.83MB / 28.24MB 0.7s
2026-05-12T15:24:19.7631041Z #5 sha256:22c736fe2dee42f2274e133f0fd657bc3a2661f48b034a8adc2ba40bb6fa4b82 24.12MB / 49.84MB 0.7s
2026-05-12T15:24:19.8663041Z #5 sha256:9b02e9fcb40102eae20d9d1fc7594b44328f4a3eb9b8a3bdb7db283d10840a30 23.07MB / 28.24MB 0.8s
2026-05-12T15:24:19.8664268Z #5 sha256:22c736fe2dee42f2274e133f0fd657bc3a2661f48b034a8adc2ba40bb6fa4b82 31.46MB / 49.84MB 0.8s
2026-05-12T15:24:19.8664957Z #5 sha256:079e3008b73419a93cb985863971162eb59bcb78e57f6ef558fc198ad2848d89 450B / 450B 0.8s done
2026-05-12T15:24:19.9661051Z #5 sha256:9b02e9fcb40102eae20d9d1fc7594b44328f4a3eb9b8a3bdb7db283d10840a30 28.24MB / 28.24MB 0.9s
2026-05-12T15:24:19.9662262Z #5 sha256:22c736fe2dee42f2274e133f0fd657bc3a2661f48b034a8adc2ba40bb6fa4b82 38.80MB / 49.84MB 0.9s
2026-05-12T15:24:20.0670458Z #5 sha256:9b02e9fcb40102eae20d9d1fc7594b44328f4a3eb9b8a3bdb7db283d10840a30 28.24MB / 28.24MB 0.9s done
2026-05-12T15:24:20.0678219Z #5 sha256:22c736fe2dee42f2274e133f0fd657bc3a2661f48b034a8adc2ba40bb6fa4b82 48.23MB / 49.84MB 1.0s
2026-05-12T15:24:20.0680176Z #5 extracting sha256:9b02e9fcb40102eae20d9d1fc7594b44328f4a3eb9b8a3bdb7db283d10840a30
2026-05-12T15:24:20.1668966Z #5 sha256:22c736fe2dee42f2274e133f0fd657bc3a2661f48b034a8adc2ba40bb6fa4b82 49.84MB / 49.84MB 1.1s done
2026-05-12T15:24:21.6683534Z #5 extracting sha256:9b02e9fcb40102eae20d9d1fc7594b44328f4a3eb9b8a3bdb7db283d10840a30 1.6s done
2026-05-12T15:24:22.0348246Z #5 extracting sha256:5d4a3aa5a9ad18507bf18000f0280556365b57788f03aca635c4792a79799082
2026-05-12T15:24:22.1679336Z #5 extracting sha256:5d4a3aa5a9ad18507bf18000f0280556365b57788f03aca635c4792a79799082 done
2026-05-12T15:24:23.9784081Z #5 ...
2026-05-12T15:24:23.9784299Z 
2026-05-12T15:24:23.9784515Z #6 [internal] load build context
2026-05-12T15:24:23.9784873Z #6 transferring context: 870.36MB 4.3s done
2026-05-12T15:24:23.9785205Z #6 DONE 4.9s
2026-05-12T15:24:24.1288270Z 
2026-05-12T15:24:24.1289140Z #5 [1/7] FROM docker.io/library/node:22-slim@sha256:9f6d5975c7dca860947d3915877f85607946403fc55349f39b4bc3688448bb6e
2026-05-12T15:24:26.0489684Z #5 extracting sha256:22c736fe2dee42f2274e133f0fd657bc3a2661f48b034a8adc2ba40bb6fa4b82
2026-05-12T15:24:27.2009653Z #5 extracting sha256:22c736fe2dee42f2274e133f0fd657bc3a2661f48b034a8adc2ba40bb6fa4b82 1.0s done
2026-05-12T15:24:27.2010644Z #5 extracting sha256:dad35d9305371ac05c2bdf6de63217e78a5906a5f0335bd26432bbee187aea33
2026-05-12T15:24:27.4320323Z #5 extracting sha256:dad35d9305371ac05c2bdf6de63217e78a5906a5f0335bd26432bbee187aea33 0.0s done
2026-05-12T15:24:27.4321438Z #5 extracting sha256:079e3008b73419a93cb985863971162eb59bcb78e57f6ef558fc198ad2848d89 done
2026-05-12T15:24:27.4321845Z #5 DONE 8.2s
2026-05-12T15:24:27.4321955Z 
2026-05-12T15:24:27.4322067Z #7 [2/7] WORKDIR /usr/app
2026-05-12T15:24:27.4322271Z #7 DONE 0.0s
2026-05-12T15:24:27.4322382Z 
2026-05-12T15:24:27.4322556Z #8 [3/7] COPY package.json package-lock.json ./
2026-05-12T15:24:27.4322822Z #8 DONE 0.0s
2026-05-12T15:24:27.4322919Z 
2026-05-12T15:24:27.4323004Z #9 [4/7] RUN npm ci
2026-05-12T15:24:28.9797025Z #9 1.698 npm warn ERESOLVE overriding peer dependency
2026-05-12T15:24:29.1990897Z #9 1.698 npm warn While resolving: react-copy-to-clipboard@5.1.0
2026-05-12T15:24:29.1991406Z #9 1.698 npm warn Found: react@19.1.2
2026-05-12T15:24:29.1991845Z #9 1.698 npm warn node_modules/react
2026-05-12T15:24:29.1992231Z #9 1.698 npm warn   dev react@"19.1.2" from the root project
2026-05-12T15:24:29.1992672Z #9 1.698 npm warn   25 more (@dnd-kit/accessibility, @dnd-kit/core, ...)
2026-05-12T15:24:29.1992989Z #9 1.698 npm warn
2026-05-12T15:24:29.1993289Z #9 1.698 npm warn Could not resolve dependency:
2026-05-12T15:24:29.1994009Z #9 1.698 npm warn peer react@"^15.3.0 || 16 || 17 || 18" from react-copy-to-clipboard@5.1.0
2026-05-12T15:24:29.1994880Z #9 1.698 npm warn node_modules/swagger-ui-react/node_modules/react-copy-to-clipboard
2026-05-12T15:24:29.1995743Z #9 1.698 npm warn   react-copy-to-clipboard@"5.1.0" from swagger-ui-react@5.31.2
2026-05-12T15:24:29.1996191Z #9 1.698 npm warn   node_modules/swagger-ui-react
2026-05-12T15:24:29.1996791Z #9 1.698 npm warn
2026-05-12T15:24:29.1997213Z #9 1.698 npm warn Conflicting peer dependency: react@18.3.1
2026-05-12T15:24:29.1997541Z #9 1.698 npm warn node_modules/react
2026-05-12T15:24:29.1997995Z #9 1.698 npm warn   peer react@"^15.3.0 || 16 || 17 || 18" from react-copy-to-clipboard@5.1.0
2026-05-12T15:24:29.1998559Z #9 1.698 npm warn   node_modules/swagger-ui-react/node_modules/react-copy-to-clipboard
2026-05-12T15:24:29.1999113Z #9 1.698 npm warn     react-copy-to-clipboard@"5.1.0" from swagger-ui-react@5.31.2
2026-05-12T15:24:29.1999546Z #9 1.698 npm warn     node_modules/swagger-ui-react
2026-05-12T15:24:29.1999903Z #9 1.703 npm warn ERESOLVE overriding peer dependency
2026-05-12T15:24:29.2000297Z #9 1.704 npm warn While resolving: react-debounce-input@3.3.0
2026-05-12T15:24:29.2000643Z #9 1.704 npm warn Found: react@19.1.2
2026-05-12T15:24:29.2000928Z #9 1.704 npm warn node_modules/react
2026-05-12T15:24:29.2001261Z #9 1.704 npm warn   dev react@"19.1.2" from the root project
2026-05-12T15:24:29.2001697Z #9 1.704 npm warn   25 more (@dnd-kit/accessibility, @dnd-kit/core, ...)
2026-05-12T15:24:29.2002011Z #9 1.704 npm warn
2026-05-12T15:24:29.2002277Z #9 1.704 npm warn Could not resolve dependency:
2026-05-12T15:24:29.2002717Z #9 1.704 npm warn peer react@"^15.3.0 || 16 || 17 || 18" from react-debounce-input@3.3.0
2026-05-12T15:24:29.2003251Z #9 1.704 npm warn node_modules/swagger-ui-react/node_modules/react-debounce-input
2026-05-12T15:24:29.2003787Z #9 1.704 npm warn   react-debounce-input@"=3.3.0" from swagger-ui-react@5.31.2
2026-05-12T15:24:29.2004204Z #9 1.704 npm warn   node_modules/swagger-ui-react
2026-05-12T15:24:29.2004461Z #9 1.704 npm warn
2026-05-12T15:24:29.2004758Z #9 1.704 npm warn Conflicting peer dependency: react@18.3.1
2026-05-12T15:24:29.2005092Z #9 1.704 npm warn node_modules/react
2026-05-12T15:24:29.2005518Z #9 1.704 npm warn   peer react@"^15.3.0 || 16 || 17 || 18" from react-debounce-input@3.3.0
2026-05-12T15:24:29.2006379Z #9 1.704 npm warn   node_modules/swagger-ui-react/node_modules/react-debounce-input
2026-05-12T15:24:29.2007413Z #9 1.704 npm warn     react-debounce-input@"=3.3.0" from swagger-ui-react@5.31.2
2026-05-12T15:24:29.2008055Z #9 1.704 npm warn     node_modules/swagger-ui-react
2026-05-12T15:24:29.2008664Z #9 1.767 npm warn ERESOLVE overriding peer dependency
2026-05-12T15:24:29.2009302Z #9 1.767 npm warn While resolving: react-inspector@6.0.2
2026-05-12T15:24:29.2009862Z #9 1.767 npm warn Found: react@19.1.2
2026-05-12T15:24:29.2010338Z #9 1.767 npm warn node_modules/react
2026-05-12T15:24:29.2011200Z #9 1.767 npm warn   dev react@"19.1.2" from the root project
2026-05-12T15:24:29.2011961Z #9 1.767 npm warn   25 more (@dnd-kit/accessibility, @dnd-kit/core, ...)
2026-05-12T15:24:29.2012516Z #9 1.767 npm warn
2026-05-12T15:24:29.2012969Z #9 1.767 npm warn Could not resolve dependency:
2026-05-12T15:24:29.2013717Z #9 1.767 npm warn peer react@"^16.8.4 || ^17.0.0 || ^18.0.0" from react-inspector@6.0.2
2026-05-12T15:24:29.2014587Z #9 1.767 npm warn node_modules/swagger-ui-react/node_modules/react-inspector
2026-05-12T15:24:29.2015428Z #9 1.767 npm warn   react-inspector@"^6.0.1" from swagger-ui-react@5.31.2
2026-05-12T15:24:29.2016135Z #9 1.767 npm warn   node_modules/swagger-ui-react
2026-05-12T15:24:29.2016747Z #9 1.767 npm warn
2026-05-12T15:24:29.2017254Z #9 1.767 npm warn Conflicting peer dependency: react@18.3.1
2026-05-12T15:24:29.2017795Z #9 1.767 npm warn node_modules/react
2026-05-12T15:24:29.2018516Z #9 1.767 npm warn   peer react@"^16.8.4 || ^17.0.0 || ^18.0.0" from react-inspector@6.0.2
2026-05-12T15:24:29.2019416Z #9 1.767 npm warn   node_modules/swagger-ui-react/node_modules/react-inspector
2026-05-12T15:24:29.2020252Z #9 1.767 npm warn     react-inspector@"^6.0.1" from swagger-ui-react@5.31.2
2026-05-12T15:24:29.2020952Z #9 1.767 npm warn     node_modules/swagger-ui-react
2026-05-12T15:24:30.8626278Z #9 3.581 npm warn deprecated y-websocket-server@1.0.2: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
2026-05-12T15:24:31.0314114Z #9 3.750 npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
2026-05-12T15:24:31.7242998Z #9 4.442 npm warn deprecated stable@0.1.8: Modern JS already guarantees Array#sort() is a stable sort, so this library is deprecated. See the compatibility table on MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#browser_compatibility
2026-05-12T15:24:33.2568432Z #9 5.975 npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x. You should upgrade to the latest 2.x version.
2026-05-12T15:24:33.3780066Z #9 6.096 npm warn deprecated lodash.get@4.4.2: This package is deprecated. Use the optional chaining (?.) operator instead.
2026-05-12T15:24:34.2584032Z #9 6.976 npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
2026-05-12T15:24:34.5599093Z #9 7.278 npm warn deprecated glob@8.1.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
2026-05-12T15:24:34.7778802Z #9 7.349 npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
2026-05-12T15:24:34.7799635Z #9 7.495 npm warn deprecated rollup-plugin-visualizer@5.13.1: Contains unintended breaking changes
2026-05-12T15:24:35.5683722Z #9 8.286 npm warn deprecated crypto@1.0.1: This package is no longer supported. It's now a built-in Node module. If you've depended on crypto, you should switch to the one that's built-in.
2026-05-12T15:24:38.5748883Z #9 11.29 npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
2026-05-12T15:24:38.6904321Z #9 11.41 npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
2026-05-12T15:24:40.4646798Z #9 13.18 npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
2026-05-12T15:24:41.1715491Z #9 13.89 npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
2026-05-12T15:24:41.4251350Z #9 14.14 npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
2026-05-12T15:24:41.5378549Z #9 14.26 npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
2026-05-12T15:24:41.7148993Z #9 14.28 npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
2026-05-12T15:24:42.5767710Z #9 15.29 npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
2026-05-12T15:24:48.1919867Z #9 20.91 npm warn deprecated @azure/openai@1.0.0-beta.13: The Azure OpenAI client library for JavaScript beta has been retired. Please migrate to the stable OpenAI SDK for JavaScript using the migration guide: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/openai/openai/MIGRATION.md.
2026-05-12T15:24:48.6892738Z #9 21.41 npm warn deprecated @finom/zod-to-json-schema@3.24.11: Use https://www.npmjs.com/package/zod-v3-to-json-schema instead. See issue comment for details: https://github.com/StefanTerdell/zod-to-json-schema/issues/178#issuecomment-3533122539
2026-05-12T15:24:53.9223270Z #9 26.64 npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.
2026-05-12T15:25:50.9434912Z #9 83.66 
2026-05-12T15:25:50.9435689Z #9 83.66 added 2063 packages, and audited 2064 packages in 1m
2026-05-12T15:25:51.0945284Z #9 83.66 
2026-05-12T15:25:51.0945871Z #9 83.66 308 packages are looking for funding
2026-05-12T15:25:51.0946342Z #9 83.66   run `npm fund` for details
2026-05-12T15:25:51.2524427Z #9 83.97 
2026-05-12T15:25:51.2525108Z #9 83.97 72 vulnerabilities (1 low, 40 moderate, 29 high, 2 critical)
2026-05-12T15:25:51.2525696Z #9 83.97 
2026-05-12T15:25:51.2526211Z #9 83.97 To address issues that do not require attention, run:
2026-05-12T15:25:51.2527071Z #9 83.97   npm audit fix
2026-05-12T15:25:51.2527409Z #9 83.97 
2026-05-12T15:25:51.2527991Z #9 83.97 To address all issues possible (including breaking changes), run:
2026-05-12T15:25:51.2528581Z #9 83.97   npm audit fix --force
2026-05-12T15:25:51.2528882Z #9 83.97 
2026-05-12T15:25:51.2529306Z #9 83.97 Some issues need review, and may require choosing
2026-05-12T15:25:51.2529868Z #9 83.97 a different dependency.
2026-05-12T15:25:51.2530170Z #9 83.97 
2026-05-12T15:25:51.2530506Z #9 83.97 Run `npm audit` for details.
2026-05-12T15:25:51.4041278Z #9 83.97 npm notice
2026-05-12T15:25:51.4041749Z #9 83.97 npm notice New major version of npm available! 10.9.7 -> 11.14.1
2026-05-12T15:25:51.4042316Z #9 83.97 npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.14.1
2026-05-12T15:25:51.4042826Z #9 83.97 npm notice To update run: npm install -g npm@11.14.1
2026-05-12T15:25:51.4043846Z #9 83.97 npm notice
2026-05-12T15:25:52.5305617Z #9 DONE 85.2s
2026-05-12T15:25:52.6815259Z 
2026-05-12T15:25:52.6815993Z #10 [5/7] COPY . .
2026-05-12T15:25:55.1880341Z #10 DONE 2.7s
2026-05-12T15:25:55.3393595Z 
2026-05-12T15:25:55.3394384Z #11 [6/7] RUN npm run build --prefix apps/agents-server
2026-05-12T15:25:55.3785846Z #11 0.190 
2026-05-12T15:25:55.3786725Z #11 0.190 > prebuild
2026-05-12T15:25:55.3787640Z #11 0.190 > npm run generate-reserved-paths && npx kill-port 4440 ||  exit 0
2026-05-12T15:25:55.3789089Z #11 0.190 
2026-05-12T15:25:55.6217399Z #11 0.282 
2026-05-12T15:25:55.6217758Z #11 0.282 > generate-reserved-paths
2026-05-12T15:25:55.6218277Z #11 0.282 > ts-node ./scripts/generate-reserved-paths/generate-reserved-paths.ts
2026-05-12T15:25:55.6218675Z #11 0.282 
2026-05-12T15:25:57.8474108Z #11 2.658 Generated /usr/app/apps/agents-server/src/generated/reservedPaths.ts with 28 reserved paths:
2026-05-12T15:25:57.9979509Z #11 2.659 _data, _next, admin, agents, api, dashboard, docs, embed, experiments, favicon.ico, fonts, humans.txt, logo-blue-white-256.png, manifest.webmanifest, openapi.json, pixel-agents-assets, recycle-bin, restricted, robots.txt, search, security.txt, sitemap.xml, sounds, story, sw.js, swagger, system, test
2026-05-12T15:25:58.2433191Z #11 3.054 npm warn exec The following package was not found and will be installed: kill-port@2.0.1
2026-05-12T15:25:58.5891479Z #11 3.400 Process on port 4440 killed
2026-05-12T15:25:58.7501813Z #11 3.411 
2026-05-12T15:25:58.7502191Z #11 3.411 > build
2026-05-12T15:25:58.7503360Z #11 3.411 > node -r ./scripts/ignore-kill-eperm.js ../../node_modules/next/dist/bin/next build && node ./scripts/prerender-homepage.js
2026-05-12T15:25:58.7503980Z #11 3.411 
2026-05-12T15:25:59.2995182Z #11 4.111 Attention: Next.js now collects completely anonymous telemetry regarding usage.
2026-05-12T15:25:59.4038151Z #11 4.111 This information is used to shape Next.js' roadmap and prioritize features.
2026-05-12T15:25:59.4039631Z #11 4.111 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
2026-05-12T15:25:59.4040603Z #11 4.111 https://nextjs.org/telemetry
2026-05-12T15:25:59.4040858Z #11 4.111 
2026-05-12T15:25:59.4041270Z #11 4.215    ▲ Next.js 15.4.11
2026-05-12T15:25:59.4041576Z #11 4.215    - Experiments (use with caution):
2026-05-12T15:25:59.5900098Z #11 4.215      ✓ externalDir
2026-05-12T15:25:59.5900860Z #11 4.215 
2026-05-12T15:25:59.5901913Z #11 4.251    Creating an optimized production build ...
2026-05-12T15:27:16.5945956Z #11 81.41 <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (126kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
2026-05-12T15:27:17.3137667Z #11 82.12 Failed to compile.
2026-05-12T15:27:17.3139637Z #11 82.12 
2026-05-12T15:27:17.4677859Z #11 82.12 ./src/app/embed/page.tsx
2026-05-12T15:27:17.4679150Z #11 82.12 Error:   [31mx[0m Expected a template literal, string or identifier inside the JSXExpressionContainer.
2026-05-12T15:27:17.4680492Z #11 82.12   [31m|[0m Read more: https://nextjs.org/docs/messages/invalid-styled-jsx-children
2026-05-12T15:27:17.4681654Z #11 82.12     ,-[[36;1;4m/usr/app/apps/agents-server/src/app/embed/page.tsx[0m:60:1]
2026-05-12T15:27:17.4682353Z #11 82.12  [2m57[0m |     
2026-05-12T15:27:17.4682897Z #11 82.12  [2m58[0m |         return (
2026-05-12T15:27:17.4683264Z #11 82.12  [2m59[0m |             <>
2026-05-12T15:27:17.4683755Z #11 82.12  [2m60[0m | [35;1m,[0m[35;1m-[0m[35;1m>[0m             <style jsx global>
2026-05-12T15:27:17.4684242Z #11 82.12  [2m61[0m | [35;1m|[0m                   {spaceTrim(`
2026-05-12T15:27:17.4684681Z #11 82.12  [2m62[0m | [35;1m|[0m                       html,
2026-05-12T15:27:17.4685110Z #11 82.12  [2m63[0m | [35;1m|[0m                       body {
2026-05-12T15:27:17.4685566Z #11 82.12  [2m64[0m | [35;1m|[0m                           margin: 0;
2026-05-12T15:27:17.4686357Z #11 82.12  [2m65[0m | [35;1m|[0m                           width: 100%;
2026-05-12T15:27:17.4687090Z #11 82.12  [2m66[0m | [35;1m|[0m                           height: 100%;
2026-05-12T15:27:17.4687636Z #11 82.12  [2m67[0m | [35;1m|[0m                           background: transparent !important;
2026-05-12T15:27:17.4688167Z #11 82.12  [2m68[0m | [35;1m|[0m                           overflow: hidden;
2026-05-12T15:27:17.4688607Z #11 82.12  [2m69[0m | [35;1m|[0m                       }
2026-05-12T15:27:17.4689087Z #11 82.12  [2m70[0m | [35;1m|[0m   
2026-05-12T15:27:17.4689488Z #11 82.12  [2m71[0m | [35;1m|[0m                       #__next {
2026-05-12T15:27:17.4689943Z #11 82.12  [2m72[0m | [35;1m|[0m                           width: 100%;
2026-05-12T15:27:17.4690409Z #11 82.12  [2m73[0m | [35;1m|[0m                           height: 100%;
2026-05-12T15:27:17.4690832Z #11 82.12  [2m74[0m | [35;1m|[0m                       }
2026-05-12T15:27:17.4691240Z #11 82.12  [2m75[0m | [35;1m|[0m                   `)}
2026-05-12T15:27:17.4691705Z #11 82.12  [2m76[0m | [35;1m`[0m[35;1m-[0m[35;1m>[0m             </style>
2026-05-12T15:27:17.4692185Z #11 82.12  [2m77[0m |                 <PromptbookAgentIntegration
2026-05-12T15:27:17.4692619Z #11 82.12  [2m78[0m |                     agentUrl={agentUrl}
2026-05-12T15:27:17.4693014Z #11 82.12  [2m79[0m |                     meta={meta}
2026-05-12T15:27:17.4693289Z #11 82.12     `----
2026-05-12T15:27:17.4693476Z #11 82.12 
2026-05-12T15:27:17.4693720Z #11 82.12 Import trace for requested module:
2026-05-12T15:27:17.4694019Z #11 82.12 ./src/app/embed/page.tsx
2026-05-12T15:27:17.4694246Z #11 82.13 
2026-05-12T15:27:17.4694400Z #11 82.13 
2026-05-12T15:27:17.4694653Z #11 82.13 > Build failed because of webpack errors
2026-05-12T15:27:19.9229706Z #11 ERROR: process "/bin/sh -c npm run build --prefix apps/agents-server" did not complete successfully: exit code: 1
2026-05-12T15:27:19.9336068Z ------
2026-05-12T15:27:19.9338455Z  > [6/7] RUN npm run build --prefix apps/agents-server:
2026-05-12T15:27:19.9339432Z 82.12  [2m77[0m |                 <PromptbookAgentIntegration
2026-05-12T15:27:19.9340906Z 82.12  [2m78[0m |                     agentUrl={agentUrl}
2026-05-12T15:27:19.9342202Z 82.12  [2m79[0m |                     meta={meta}
2026-05-12T15:27:19.9342619Z 82.12     `----
2026-05-12T15:27:19.9342876Z 82.12 
2026-05-12T15:27:19.9343229Z 82.12 Import trace for requested module:
2026-05-12T15:27:19.9343679Z 82.12 ./src/app/embed/page.tsx
2026-05-12T15:27:19.9344047Z 82.13 
2026-05-12T15:27:19.9344294Z 82.13 
2026-05-12T15:27:19.9344706Z 82.13 > Build failed because of webpack errors
2026-05-12T15:27:19.9345097Z ------
2026-05-12T15:27:19.9345389Z Dockerfile:14
2026-05-12T15:27:19.9357452Z --------------------
2026-05-12T15:27:19.9358182Z   12 |     # DockerHub should publish the production Agents Server by default.
2026-05-12T15:27:19.9358829Z   13 |     ENV NEXT_PUBLIC_SITE_URL=http://localhost:4440
2026-05-12T15:27:19.9359366Z   14 | >>> RUN npm run build --prefix apps/agents-server
2026-05-12T15:27:19.9359761Z   15 |     
2026-05-12T15:27:19.9360147Z   16 |     WORKDIR /usr/app/apps/agents-server
2026-05-12T15:27:19.9360583Z --------------------
2026-05-12T15:27:19.9361584Z ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build --prefix apps/agents-server" did not complete successfully: exit code: 1
2026-05-12T15:27:19.9454740Z ##[error]buildx failed with: ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build --prefix apps/agents-server" did not complete successfully: exit code: 1
2026-05-12T15:27:19.9553334Z Post job cleanup.
2026-05-12T15:27:20.0373060Z ##[group]Removing temp folder /tmp/docker-build-push-VrwzOI
2026-05-12T15:27:20.0384900Z ##[endgroup]
2026-05-12T15:27:20.0392482Z (node:2970) [DEP0147] DeprecationWarning: In future versions of Node.js, fs.rmdir(path, { recursive: true }) will be removed. Use fs.rm(path, { recursive: true }) instead
2026-05-12T15:27:20.0394326Z (Use `node --trace-deprecation ...` to show where the warning was created)
2026-05-12T15:27:20.0477231Z Post job cleanup.
2026-05-12T15:27:20.1406511Z [command]/usr/bin/docker logout 
2026-05-12T15:27:20.1526679Z Removing login credentials for https://index.docker.io/v1/
2026-05-12T15:27:20.1632423Z Post job cleanup.
2026-05-12T15:27:20.2626745Z [command]/usr/bin/git version
2026-05-12T15:27:20.2675960Z git version 2.53.0
2026-05-12T15:27:20.2730370Z Temporarily overriding HOME='/home/runner/work/_temp/457bde15-ba2d-467f-aac4-55635ae45284' before making global git config changes
2026-05-12T15:27:20.2732355Z Adding repository directory to the temporary git global config as a safe directory
2026-05-12T15:27:20.2750631Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/promptbook/promptbook
2026-05-12T15:27:20.2789705Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2026-05-12T15:27:20.2825893Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2026-05-12T15:27:20.3022705Z Entering 'book'
2026-05-12T15:27:20.3078507Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2026-05-12T15:27:20.3098492Z http.https://github.com/.extraheader
2026-05-12T15:27:20.3115133Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2026-05-12T15:27:20.3147223Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2026-05-12T15:27:20.3337714Z Entering 'book'
2026-05-12T15:27:20.3389717Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
2026-05-12T15:27:20.3425351Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
2026-05-12T15:27:20.3629279Z Entering 'book'
2026-05-12T15:27:20.3645229Z file:/home/runner/work/promptbook/promptbook/.git/modules/book/config	remote.origin.url
2026-05-12T15:27:20.3675253Z [command]/usr/bin/git config --file /home/runner/work/promptbook/promptbook/.git/modules/book/config --name-only --get-regexp ^includeIf\.gitdir:
2026-05-12T15:27:20.3816926Z Cleaning up orphan processes
2026-05-12T15:27:20.4090110Z ##[warning]Node.js 20 actions are deprecated. The following actions are running on Node.js 20 and may not work as expected: actions/checkout@v4, actions/setup-node@v4, docker/build-push-action@v2, docker/login-action@v2. Actions will be forced to run with Node.js 24 by default starting June 2nd, 2026. Node.js 20 will be removed from the runner on September 16th, 2026. Please check if updated versions of these actions are available that support Node.js 24. To opt into Node.js 24 now, set the FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true environment variable on the runner or in your workflow file. Once Node.js 24 becomes the default, you can temporarily opt out by setting ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
```
