export const checkSlackScreen = async ({
	sendResponse,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	sendResponse: any;
}) => {
	const teamMatch = location.href.match(/(?<=\/client\/).+?(?=\/)/g);
	if (!teamMatch) return;

	const teamID = teamMatch[0];

	// parse localConfig_v2
	if (!localStorage || !localStorage.localConfig_v2) return;

	const slackCFG = JSON.parse(localStorage.localConfig_v2);
	if (!slackCFG) return;

	// get token in localConfig_v2
	if (!slackCFG.teams) return;
	if (!slackCFG.teams[teamID]) return;
	if (!slackCFG.teams[teamID].token) return;

	const token = slackCFG.teams[teamID].token;

	chrome.runtime.sendMessage(
		{
			event: "Background_CheckSlackScreen",
			token,
			teamID,
		},
		() => {
			// console.log(response);
		},
	);

	sendResponse("ContentScripts_CheckSlackScreen");
};

export const onMessage = ({
	request,
	sendResponse,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	request: any;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	sendResponse: any;
}) => {
	if (request.event === "ContentScripts_CheckSlackScreen") {
		checkSlackScreen({ sendResponse });
		return;
	}

	sendResponse("ContentScripts_Default");
};

/**
 * main、backgroundからのsendMessageを受け取る
 */
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
	onMessage({ request, sendResponse });
});
