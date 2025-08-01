<script lang="ts">
	import { Wllama, type WllamaChatMessage } from '@wllama/wllama';
	import wllamaSingle from '@wllama/wllama/src/single-thread/wllama.wasm?url';
	import wllamaMulti from '@wllama/wllama/src/multi-thread/wllama.wasm?url';
	import { onMount } from 'svelte';
	import Loading from '$lib/loading.svelte';
	import Send from '$lib/send.svelte';
	import { account } from '$lib/appwrite';
	import { goto } from '$app/navigation';

	let fullTextInput = $state('');

	let progress = $state(0);
	let userTextInput = $state('');
	let assistantResponse = $state('');
	let typedAssistantResponse = $state('');
	let index = 0;
	let generationController: any;
	let chatHistory: WllamaChatMessage[] = $state([
		{
			role: 'system',
			content: 'You are a digital assistant named Aives. Be concise in your responses.'
		}
	]);

	let dropdown = $state(false);

	let generating = $state(false);

	let wllama: Wllama;
	let loggedInUser: any = $state(null);

	onMount(async () => {
		try {
			console.log(account);

			loggedInUser = await account.get();
		} catch (error) {
			console.error(error);
			goto('/');
		}

		const CONFIG_PATHS = {
			'single-thread/wllama.wasm': wllamaSingle,
			'multi-thread/wllama.wasm': wllamaMulti
		};

		wllama = new Wllama(CONFIG_PATHS, {
			parallelDownloads: 5
		});

		const progressCallback = ({ loaded, total }) => {
			const progressPercentage = Math.round((loaded / total) * 100);
			progress = progressPercentage;
		};

		await wllama.loadModelFromHF('LiquidAI/LFM2-350M-GGUF', 'LFM2-350M-Q4_K_M.gguf', {
			progressCallback
		});
	});

	async function generateResponse(prompt: string) {
		if (!prompt.trim() || generating) {
			return;
		}

		const userMessage = prompt.trim();
		chatHistory.push({ role: 'user', content: userMessage });

		userTextInput = '';
		generating = true;
		generationController = new AbortController();
		const signal = generationController.signal;

		assistantResponse = '';
		typedAssistantResponse = '';

		console.log(userMessage);

		chatHistory.push({ role: 'assistant', content: typedAssistantResponse });
		index = chatHistory.length - 1;

		let responseTokens = userMessage.length * 12;
		responseTokens = Math.min(responseTokens, 1024);

		console.log(responseTokens);

		const stream = await wllama.createChatCompletion(chatHistory, {
			abortSignal: signal,
			nPredict: responseTokens,
			sampling: {
				temp: 0.3,
				min_p: 0.15,
				penalty_repeat: 1.05
			},
			onNewToken: (tok: number, piece: Uint8Array, word: string) => {
				console.log(word);
			},
			stream: true
		});

		if (!generating) {
			console.log('ABORT STREAM');
			return;
		}

		for await (const chunk of stream) {
			assistantResponse = chunk.currentText;
			if (typedAssistantResponse.length < assistantResponse.length) {
				if (assistantResponse[typedAssistantResponse.length] != undefined) {
					typedAssistantResponse += assistantResponse[typedAssistantResponse.length];
				} else {
					typedAssistantResponse += ' ';
				}
				chatHistory[index] = { role: 'assistant', content: typedAssistantResponse };
			}
		}

		const typingInterval = setInterval(function () {
			if (!generating && chatHistory.length - 1 != index) {
				console.log('Cleared Interval');
				clearInterval(typingInterval);
			} else if (generationController.aborted) {
				console.log('ABORTED');
				if (chatHistory.length - 1 == index) {
					chatHistory.pop();
				}
			} else if (typedAssistantResponse.length < assistantResponse.length) {
				typedAssistantResponse += assistantResponse[typedAssistantResponse.length];
				chatHistory[index] = { role: 'assistant', content: typedAssistantResponse };
			}
		}, 5);

		generating = false;
	}

	async function logout() {
		await account.deleteSession('current');
		loggedInUser = null;
		goto('/');
	}
</script>

<main>
	{#if progress < 100}
		<p class="fixed top-2 left-2 z-50">Loading model... {progress}%</p>
	{:else}
		<div
			class="fixed top-4 left-1/2 flex w-full max-w-6xl -translate-x-1/2 flex-row justify-between bg-bkg px-6"
		>
			<button
				class="flex h-12 flex-row bg-transparent px-2 hover:text-lgr"
				onclick={() => (dropdown = !dropdown)}
			>
				<h1 class="hover:text-lgr">⏱</h1>
				{dropdown ? '<' : '>'}
			</button>

			{#if loggedInUser}
				<button class="h-12 px-4" onclick={logout}>Logout</button>
			{/if}
		</div>
		<div class="mx-auto mb-16 flex h-full w-full max-w-6xl flex-col justify-end gap-y-4">
			{#each chatHistory as message (message.role)}
				{#if message.role != 'system'}
					<div
						class="flex min-h-8 w-fit flex-col justify-center rounded-t-lg rounded-bl-lg p-4 {message.role ==
						'assistant'
							? 'mr-auto font-light'
							: 'ml-auto rounded-br-none bg-gr font-light'}"
					>
						{#if message.role == 'assistant'}
							<h2 class="font-extrabold">Aives</h2>
						{/if}
						{#if message.content == ''}
							<Loading></Loading>
						{:else}
							{message.content}
						{/if}
					</div>
				{/if}
			{/each}
		</div>
		<div class="mx-auto flex w-full max-w-6xl flex-row">
			<div
				role="textbox"
				contenteditable="true"
				class="inline w-full border-2 border-gr p-2 focus:outline-0"
				bind:innerText={userTextInput}
				bind:innerHTML={fullTextInput}
				placeholder="Type your message..."
				tabindex="0"
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' && !e.shiftKey && !generating) {
						generateResponse(userTextInput);
						generating = true;
						e.preventDefault();
					}
				}}
				oninput={(e) => {
					if (fullTextInput.trim() === '<br>') fullTextInput = '';
				}}
			></div>
			<button
				class="mt-auto flex size-12 cursor-pointer items-center justify-center bg-gr"
				onclick={async () => {
					if (!generating) {
						generateResponse(userTextInput);
						generating = true;
					} else {
						generationController.abort();
						console.log('ABORT');
						generating = false;

						if (chatHistory.length - 1 == index) {
							console.log('CHAT HISTORY DELETE');
							chatHistory.pop();
						}
					}
				}}
			>
				{#if generating}
					<Loading></Loading>
				{:else}
					<Send></Send>
				{/if}
			</button>
		</div>
	{/if}
</main>
