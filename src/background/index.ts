export type Channel = { id: string; name: string };
export type Channels = Channel[];

export const getChannelListJSON = async ({
	nextCursor,
	token,
	d,
}: {
	nextCursor?: string;
	token: string;
	d: string;
}) => {
	const cursor = nextCursor ? `cursor=${nextCursor}` : "";
	const channelListApi = `https://slack.com/api/conversations.list?pretty=1&limit=1000&${cursor}`;
	const formData = new FormData();
	formData.append("token", token);
	const channelListResponse = await fetch(channelListApi, {
		method: "post",
		headers: new Headers({
			Cookie: `d=${d}`,
		}),
		body: formData,
	});
	const channelListJSON: {
		channels: Channels;
		response_metadata: {
			next_cursor: string;
		};
	} = await channelListResponse.json();

	return channelListJSON;
};

export const getChannels = async ({
	token,
	d,
}: { token: string; d: string }) => {
	const channelListJson = await getChannelListJSON({ token, d });
	let channels = channelListJson.channels;
	let nextCursor = channelListJson.response_metadata.next_cursor;

	while (nextCursor) {
		const json = await getChannelListJSON({ nextCursor, token, d });
		channels = [...channels, ...json.channels];
		nextCursor = json.response_metadata.next_cursor;
	}

	return channels;
};

export const checkSlackScreen = ({
	token,
	teamID,
	sendResponse,
}: {
	token: string;
	teamID: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	sendResponse: any;
}) => {
	chrome.cookies.get(
		{ url: "https://slack.com", name: "d" },
		async (dCookie) => {
			if (!dCookie) return;
			if (!dCookie.value) return;

			const d = dCookie.value;
			const channels = await getChannels({ token, d });
			chrome.runtime.sendMessage(
				{
					event: "Main_CheckSlackScreen",
					teamID,
					token,
					d,
					channels,
				},
				() => {
					// console.log(response);
				},
			);
		},
	);

	sendResponse("Background_CheckSlackScreen");
};

export const postMessage = async ({
	token,
	d,
	id,
	text,
	sendResponse,
}: {
	token: string;
	d: string;
	id: string;
	text: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	sendResponse: any;
}) => {
	const postMessageApi = "https://slack.com/api/chat.postMessage";
	const formData = new FormData();
	formData.append("token", token);
	formData.append("channel", id);
	formData.append("text", text);

	const postMessageResponse = await fetch(postMessageApi, {
		method: "post",
		headers: new Headers({
			Cookie: `d=${d}`,
		}),
		body: formData,
	});
	const postMessageJSON: {
		channels: Channels;
		response_metadata: {
			next_cursor: string;
		};
	} = await postMessageResponse.json();

	sendResponse("Background_PostMessage");
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
	if (request.event === "Background_CheckSlackScreen") {
		checkSlackScreen({
			token: request.token,
			teamID: request.teamID,
			sendResponse,
		});
		return;
	}
	if (request.event === "Background_PostMessage") {
		postMessage({
			token: request.token,
			d: request.d,
			id: request.id,
			text: request.text,
			sendResponse,
		});
		return;
	}

	sendResponse("Background_Default");
};

/**
 * main、backgroundからのsendMessageを受け取る
 */
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
	onMessage({ request, sendResponse });
});
