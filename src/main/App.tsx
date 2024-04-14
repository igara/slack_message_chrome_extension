import React from "react";
import "./App.css";

import type { Channel, Channels } from "../background";

type Message = {
	channel: Channel;
	text: string;
	memo: string;
};
type Messages = Message[];

type SlackInfo = {
	token: string;
	d: string;
	teamID: string;
};

function App() {
	const [tabID, setTabID] = React.useState<number | null>(null);
	const [slackInfo, setSlackInfo] = React.useState<SlackInfo | null>(null);
	const [channels, setChannels] = React.useState<Channels>([]);
	const [messages, setMessages] = React.useState<Messages>([]);

	React.useEffect(() => {
		(async () => {
			chrome.tabs.query({ active: true, currentWindow: true }, (queryTab) => {
				if (queryTab.length === 0) return;
				const tab = queryTab[0];
				if (!tab) return;
				if (!tab.id) return;
				if (!tab.url) return;

				if (/^https:\/\/app.slack.com\/client/.test(tab.url)) {
					setTabID(tab.id);

					chrome.tabs
						.sendMessage(tab.id, {
							event: "ContentScripts_CheckSlackScreen",
						})
						.then((a) => {
							// console.log(a);
						})
						.catch((b) => {
							// console.log(b);
						});
				}
			});

			chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
				if (request.event === "Main_CheckSlackScreen") {
					console.log(request);
					setSlackInfo({
						token: request.token,
						d: request.d,
						teamID: request.teamID,
					});
					setChannels(request.channels);

					try {
						const messagesJSONString = localStorage.getItem(
							`messages_${request.teamID}`,
						);
						const oldMessages = messagesJSONString
							? JSON.parse(messagesJSONString)
							: [];
						setMessages(oldMessages);
					} catch (e) {
						setMessages([]);
					}

					sendResponse();
					return;
				}

				sendResponse();
			});
		})();
	}, []);

	const onClickAddMessage = () => {
		setMessages((prev) => [
			...prev,
			{
				channel: channels[0],
				text: "",
				memo: "",
			},
		]);
	};

	const onSubmitMessage: React.FormEventHandler<HTMLFormElement> = (e) => {
		if (tabID === null) return;
		if (slackInfo === null) return;

		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		const id = formData.get("id");
		const text = formData.get("text");
		if (!id) return;
		if (!text) return;

		chrome.runtime.sendMessage(
			{
				event: "Background_PostMessage",
				token: slackInfo.token,
				d: slackInfo.d,
				id,
				text,
			},
			() => {
				// console.log(response);
			},
		);
	};

	const onChangeMessage = (
		e: React.FormEvent<HTMLFormElement>,
		index: number,
	) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		const id = formData.get("id");
		const text = formData.get("text") ? formData.get("text") : "";
		const memo = formData.get("memo") ? formData.get("memo") : "";

		const channel = channels.find((channel) => channel.id === id);
		if (!channel) return;
		if (!slackInfo) return;

		const newMessages = [...messages];
		newMessages[index] = {
			channel,
			text: text as string,
			memo: memo as string,
		};

		setMessages(newMessages);
		localStorage.setItem(
			`messages_${slackInfo.teamID}`,
			JSON.stringify(newMessages),
		);
	};

	return (
		<div className="w-80 h-96 p-3">
			<h1>slack_message_chrome_extension</h1>

			<div>
				<h2>Slackの情報取得確認</h2>

				<div>
					Slackの画面で
					{tabID === null ? (
						<span className="text-red-500">実行してください</span>
					) : (
						<span className="text-green-500">実行中</span>
					)}
				</div>
				<div>
					Slackの認証情報を
					{slackInfo === null ? (
						<span className="text-red-500">未取得</span>
					) : (
						<span className="text-green-500">取得済み</span>
					)}
				</div>
			</div>

			<div>
				<h2>チャットメッセージ登録</h2>

				{channels.length !== 0 && (
					<div>
						<button type="button" onClick={onClickAddMessage}>
							➕
						</button>

						<div>
							{messages.map((message, index) => (
								<div
									className="max-w-sm mx-auto"
									key={`${message.channel.id}_${index}`}
								>
									<form
										onSubmit={onSubmitMessage}
										onChange={(e) => onChangeMessage(e, index)}
									>
										<select
											name="id"
											className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
										>
											{channels.map((channel) => (
												<option
													key={channel.id}
													value={channel.id}
													selected={message.channel.id === channel.id}
												>
													{channel.name}
												</option>
											))}
										</select>
										<textarea
											name="text"
											rows={4}
											className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
											placeholder="メッセージを入力してください"
										>
											{message.text}
										</textarea>

										<textarea
											name="memo"
											rows={4}
											className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
											placeholder="メモ"
										>
											{message.memo}
										</textarea>

										<button
											type="submit"
											className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
										>
											送信する
										</button>
									</form>

									<button type="button" onClick={onClickAddMessage}>
										➕
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default App;
