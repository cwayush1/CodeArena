const axios = require('axios');
const cheerio = require('cheerio');

async function fetchCodeChef(handle) {
    try {
        const url = `https://www.codechef.com/users/${handle}`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const rating = parseInt($('.rating-number').text()) || 0;
        const stars = $('.rating-star span').length || 0;
        const highestRatingText = $('.rating-header small').text();
        const maxRating = parseInt(highestRatingText.match(/\d+/)) || rating;
        const globalRank = $('.rating-ranks ul li:first-child strong').text() || "N/A";
     
        const solvedText = $('h5:contains("Fully Solved")').text(); 
        const solved = parseInt(solvedText.match(/\d+/)) || 0;

        return {
            status: "OK",
            handle: handle,
            rating: rating,
            maxRating: maxRating,
            rank: globalRank, 
            solved: solved,
            extra: `${stars}★`,
            };
    } catch (err) {
        return { status: "FAILED", platform: "codechef", message: "User not found" };
    }
}

async function fetchCodeforces(handle) {
    try {
        const infoUrl = `https://codeforces.com/api/user.info?handles=${handle}`;
        const infoResponse = await axios.get(infoUrl);
        const user = infoResponse.data.result[0];

        if (!user) throw new Error("User not found");

        return {
            status: "OK",
            handle: user.handle,
            rating: user.rating || 0,
            maxRating: user.maxRating || 0,
            rank: user.rank || "unrated", 
            solved: "N/A",
          };
    } catch (err) {
        return { status: "FAILED", platform: "codeforces", message: "User not found" };
    }
}

async function fetchLeetCode(handle) {
    try {
        const query = `
            query userPublicProfile($username: String!) {
                matchedUser(username: $username) {
                    profile {
                        ranking
                        userAvatar
                        realName
                    }
                    submitStats {
                        acSubmissionNum {
                            difficulty
                            count
                            submissions
                        }
                    }
                }
            }
        `;

        const response = await axios.post('https://leetcode.com/graphql', {
            query,
            variables: { username: handle }
        }, {
            headers: { 
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com' 
            }
        });

        const data = response.data.data.matchedUser;
        if (!data) throw new Error("User not found");

        const allSolved = data.submitStats.acSubmissionNum.find(s => s.difficulty === "All");
        
        return {
            status: "OK",
            handle: handle,
            platform: "leetcode",
            rating: "N/A",
            maxRating: "N/A",
            rank: data.profile.ranking,
            solved: allSolved ? allSolved.count : 0,
            extra: `Rank ${data.profile.ranking}`,
            icon: data.profile.userAvatar || "/assets/leetcode_logo.png"
        };

    } catch (err) {
        return { status: "FAILED", platform: "leetcode", message: "User not found" };
    }
}

async function fetchAtCoder(handle) {
    try {
        const url = `https://atcoder.jp/users/${handle}`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        
        let rating = 0;
        let maxRating = 0;
        let rank = 0;
        
        $('.dl-table tr').each((i, el) => {
            const header = $(el).find('th').text().trim();
            const value = $(el).find('td').text().trim();

            if (header === "Rating") {
                rating = parseInt(value.split(' ')[0]) || 0; 
            }
            if (header === "Highest Rating") {
                maxRating = parseInt(value) || 0;
            }
            if (header === "Rank") {
                rank = parseInt(value) || 0;
            }
        });

        
        return {
            status: "OK",
            handle: handle,
            platform: "atcoder",
            rating: rating,
            maxRating: maxRating || rating,
            rank: rank,
            solved: "N/A",
            extra: `${rating} Rating`,
            icon: "/assets/atcoder_logo.png"
        };

    } catch (err) {
        return { status: "FAILED", platform: "atcoder", message: "User not found" };
    }
}
module.exports = {
    fetchCodeChef,
    fetchCodeforces,
    fetchLeetCode,
    fetchAtCoder
};