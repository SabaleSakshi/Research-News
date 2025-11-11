import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearch } from "@langchain/tavily";
import dotenv from "dotenv";
import axios from "axios";
import { z } from "zod";

dotenv.config();

const gemini = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.3,
  apiKey: process.env.GOOGLE_API_KEY,
});

const tavilyTool = new TavilySearch({
  apiKey: process.env.TAVILY_API_KEY,
  maxResults: 3,
});

async function fetchResearchPapers(topic) {
  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
    topic
  )}&start=0&max_results=3`;

  const response = await axios.get(url);
  const entries = [...response.data.matchAll(/<entry>[\s\S]*?<\/entry>/g)].map(
    (entry) => {
      const titleMatch = entry[0].match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = entry[0].match(/<id>(.*?)<\/id>/);
      const title = titleMatch
        ? titleMatch[1].replace(/\s+/g, " ").trim()
        : "No title found";
      const link = linkMatch ? linkMatch[1].trim() : "No link";
      return { title, link };
    }
  );
  return entries.slice(0, 3);
}

export const ResearchAndNewsTool = new DynamicStructuredTool({
  name: "research_and_news_tool",
  description:
    "Fetches research papers from arXiv and recent news from Tavily, summarized with Gemini.",
  schema: z.object({
    topic: z.string().describe("Topic to research."),
  }),
  func: async ({ topic }) => {
    try {
      const [papers, news] = await Promise.all([
        fetchResearchPapers(topic),
        tavilyTool.invoke({ query: topic }),
      ]);

      const prompt = `
Summarize data on "${topic}" as:
### Research Papers
- Title (link)
### News
- Title
- URL
- Short Summary

Research:
${JSON.stringify(papers, null, 2)}

News:
${JSON.stringify(news, null, 2)}
`;

      const summary = await gemini.invoke([{ role: "user", content: prompt }]);
      //   console.log("Raw Summary:", summary.content);
      const output =
        summary?.content || summary?.response || "No summary generated";

      return output;
    } catch (err) {
      return `❌ Error: ${err.message}`;
    }
  },
});
