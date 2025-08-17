import React, { useState, useEffect } from "react";

// Main application component for the literary quote finder.
const App = () => {
  // State variables to manage the application's UI and data.
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState("author");
  const quotesPerPage = 5; // Reverted to 5 quotes per page

  // Function to handle the search logic by calling the Gemini API.
  const handleSearch = async () => {
    // Clear previous results and set loading state.
    setResults([]);
    setCurrentPage(1); // Reset to the first page on a new search
    setIsLoading(true);
    setHasSearched(true);

    // The prompt for the Gemini API to get a list of relevant literary quotes.
    const prompt = `Find 10 meaningful literary quotes that contain the word "${searchTerm}".
    Each quote must be from a famous book or author.
    Provide the response as a JSON array of objects. Each object should have the following properties: "quote", "book", and "author".
    If no quotes are found, return an empty JSON array.`;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              quote: { type: "STRING" },
              book: { type: "STRING" },
              author: { type: "STRING" },
            },
            propertyOrdering: ["quote", "book", "author"],
          },
        },
      },
    };
    const apiKey = process.env.VITE_API_KEY // Canvas will provide this.
    let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let responseData = null;
    let retries = 0;
    const maxRetries = 5;
    let delay = 1000;

    // Implement exponential backoff for API calls.
    while (retries < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          responseData = await response.json();
          break; // Exit the loop on success
        } else {
          // If the response is not OK, it might be a temporary issue.
          throw new Error(`API call failed with status: ${response.status}`);
        }
      } catch (error) {
        console.error("API call error:", error);
        retries++;
        if (retries < maxRetries) {
          console.log(`Retrying in ${delay / 1000} seconds...`);
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2; // Double the delay for the next retry
        } else {
          console.error("Max retries reached. Giving up.");
          break; // Exit the loop after max retries
        }
      }
    }

    let parsedResults = [];
    if (
      responseData &&
      responseData.candidates &&
      responseData.candidates.length > 0
    ) {
      const text = responseData.candidates[0].content.parts[0].text;
      try {
        parsedResults = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
      }
    }

    setResults(parsedResults);
    setIsLoading(false);
  };

  // Sort the results based on the selected sort key.
  const sortedResults = [...results].sort((a, b) => {
    if (sortKey === "author") {
      return a.author.localeCompare(b.author);
    } else if (sortKey === "book") {
      return a.book.localeCompare(b.book);
    }
    return 0;
  });

  // Pagination logic
  const indexOfLastQuote = currentPage * quotesPerPage;
  const indexOfFirstQuote = indexOfLastQuote - quotesPerPage;
  const currentQuotes = sortedResults.slice(
    indexOfFirstQuote,
    indexOfLastQuote
  );

  const totalPages = Math.ceil(results.length / quotesPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4 font-inter transition-colors duration-500">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-2xl w-full text-center transition-colors duration-500">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 text-blue-600 dark:text-blue-400">
          Find a Word in a Book
        </h1>
        <p className="text-lg mb-8 text-gray-600 dark:text-gray-300">
          Enter a word to find a list of meaningful quotes that contain it.
        </p>

        {/* Search input and button container */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <input
            type="text"
            className="w-full sm:w-2/3 p-3 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 dark:text-gray-100 transition-colors duration-500"
            placeholder="e.g., world, life, love..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <button
            onClick={handleSearch}
            className="w-full sm:w-1/3 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </div>

        {/* Display area for search results */}
        <div className="mt-8 min-h-[150px] flex flex-col items-center justify-center">
          {isLoading ? (
            // Loading state
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-4 border-blue-500 border-opacity-25 border-t-blue-500 mb-4"></div>
              <p className="text-xl text-gray-500 dark:text-gray-400">
                Searching...
              </p>
            </div>
          ) : results.length > 0 ? (
            // Found results, display the list with sorting and pagination controls
            <div className="w-full">
              {/* Sorting controls */}
              <div className="flex justify-end mb-4">
                <label
                  htmlFor="sort"
                  className="text-gray-600 dark:text-gray-300 font-medium mr-2"
                >
                  Sort by:
                </label>
                <select
                  id="sort"
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                >
                  <option value="author">Author</option>
                  <option value="book">Book Title</option>
                </select>
              </div>

              {/* Quote list */}
              <div className="space-y-4">
                {currentQuotes.map((quoteObj, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-md text-left transition-colors duration-500"
                  >
                    <blockquote className="italic text-lg text-gray-800 dark:text-gray-200 mb-2 leading-relaxed">
                      "{quoteObj.quote}"
                    </blockquote>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400 font-medium">
                      — {quoteObj.author}, <cite>{quoteObj.book}</cite>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              <div className="flex justify-center mt-6 space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="py-2 px-4 rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={`py-2 px-4 rounded-lg transition-all duration-300 ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="py-2 px-4 rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Next
                </button>
              </div>
            </div>
          ) : hasSearched ? (
            // No results found after searching
            <p className="text-xl text-gray-500 dark:text-gray-400 text-center">
              No quotes found with that word. Please try a different one!
            </p>
          ) : (
            // Initial state before any search
            <p className="text-xl text-gray-500 dark:text-gray-400">
              Start your literary journey.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
