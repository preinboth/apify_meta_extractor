import { Actor, RequestQueue } from 'apify';
import { CheerioCrawler } from '@crawlee/cheerio';
import * as cheerio from 'cheerio';

interface InputSchema {
    url: string;
}

interface PageInput {
    $: cheerio.CheerioAPI;
    request: { url: string };
}

Actor.main(async () => {
    // 1. Eingabe lesen
    const input = await Actor.getInput<InputSchema>();
    if (!input) throw new Error('No input provided');
    const urls = [input.url];

    // 2. Request-Queue öffnen und befüllen
    const requestQueue = await RequestQueue.open();
    for (const url of urls) {
        await requestQueue.addRequest({ url });
    }

    // 3. Crawler konfigurieren
    const crawler = new CheerioCrawler({
        requestQueue,
        handlePageFunction: async ({ $, request }: PageInput) => {
            const title = $('head > title').text();
            const description = $('meta[name="description"]').attr('content') || '';
            const ogTitle = $('meta[property="og:title"]').attr('content') || '';
            const ogImage = $('meta[property="og:image"]').attr('content') || '';
            const ogDescription = $('meta[property="og:description"]').attr('content') || '';

            await Actor.pushData({
                url: request.url,
                title,
                description,
                ogTitle,
                ogImage,
                ogDescription,
            });
        },
        // Optional: gleichzeitige Anfragen begrenzen
        maxConcurrency: 10,
        // Optional: Fehler-Handling
        handleFailedRequestFunction: async ({ request }) => {
            console.warn(`Request failed twice: ${request.url}`);
        },
    });

    // 4. Crawler ausführen
    await crawler.run();
});
