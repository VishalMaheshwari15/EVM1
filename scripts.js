document.addEventListener('DOMContentLoaded', function() {
    const content = document.getElementById('content');
    let votes = JSON.parse(localStorage.getItem('votes')) || {};
    let users = JSON.parse(localStorage.getItem('users')) || { admin: { password: hashPassword('admin'), role: 'admin' } };
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let hasVoted = JSON.parse(localStorage.getItem('hasVoted')) || {};
    let candidates = JSON.parse(localStorage.getItem('candidates')) || {
        bjp: 'BJP',
        congress: 'Congress',
        tmc: 'TMC',
        shivSena: 'Shiv Sena',
        aap: 'AAP',
        bsp: 'BSP'
    };

    function loadPage(page) {
        fetch(page)
            .then(response => response.text())
            .then(data => {
                content.innerHTML = data;
                if (page === 'vote.html') {
                    setupVoting();
                } else if (page === 'results.html') {
                    showResults();
                } else if (page === 'login.html') {
                    setupLogin();
                } else if (page === 'register.html') {
                    setupRegister();
                } else if (page === 'admin.html') {
                    setupAdmin();
                } else if (page === 'history.html') {
                    showHistory();
                }
                updateNavigation();
                if (page === 'home.html') {
                    setupSlider();
                }
            })
            .catch(error => console.error('Error loading page:', error));
    }

    document.querySelectorAll('nav ul li a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = link.getAttribute('href');
            if ((page === 'vote.html' && !currentUser) || (page === 'admin.html' && (!currentUser || currentUser.role !== 'admin'))) {
                loadPage('login.html');
            } else {
                loadPage(page);
            }
        });
    });

    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });

    loadPage('home.html');

    function setupVoting() {
        if (hasVoted[currentUser.username]) {
            alert('You have already voted.');
            loadPage('results.html');
            return;
        }

        const votingContainer = document.getElementById('voting-container');
        votingContainer.innerHTML = '';
        Object.keys(candidates).forEach(key => {
            const candidate = candidates[key];
            const voteOption = document.createElement('div');
            voteOption.classList.add('vote-option');
            voteOption.setAttribute('data-candidate', key);
            voteOption.innerHTML = `
                <h2>${candidate}</h2>
                <p>Description of ${candidate}.</p>
            `;
            voteOption.addEventListener('click', function() {
                const candidateKey = this.getAttribute('data-candidate');
                if (confirm(`Are you sure you want to vote for ${candidates[candidateKey]}?`)) {
                    votes[candidateKey] = (votes[candidateKey] || 0) + 1;
                    localStorage.setItem('votes', JSON.stringify(votes));
                    hasVoted[currentUser.username] = true;
                    localStorage.setItem('hasVoted', JSON.stringify(hasVoted));
                    alert('Vote recorded for ' + candidates[candidateKey] + '!');
                    sendEmail(currentUser.username, `You have successfully voted for ${candidates[candidateKey]}`);
                    loadPage('results.html');
                }
            });
            votingContainer.appendChild(voteOption);
        });
    }

    function showResults() {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';
        Object.keys(candidates).forEach(key => {
            const candidate = candidates[key];
            resultsContainer.innerHTML += `<p>${candidate}: ${votes[key] || 0} votes</p>`;
        });

        const ctx = document.createElement('canvas');
        ctx.classList.add('chart-container');
        resultsContainer.appendChild(ctx);
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.values(candidates),
                datasets: [{
                    data: Object.keys(candidates).map(key => votes[key] || 0),
                    backgroundColor: Object.keys(candidates).map((_, index) => `hsl(${index * 60}, 70%, 50%)`)
                }]
            }
        });
    }

    function setupLogin() {
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            if (users[username] && users[username].password === hashPassword(password)) {
                currentUser = { username, role: users[username].role };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                alert('Login successful!');
                loadPage('vote.html');
            } else {
                alert('Invalid username or password.');
            }
        });
    }

    function setupRegister() {
        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            if (!users[username]) {
                users[username] = { password: hashPassword(password), role: 'user' };
                localStorage.setItem('users', JSON.stringify(users));
                alert('Registration successful!');
                sendEmail(username, 'Welcome to the Advanced Electronic Voting Machine!');
                loadPage('login.html');
            } else {
                alert('Username already exists.');
            }
        });
    }

    function setupAdmin() {
        if (currentUser.role !== 'admin') {
            alert('Access denied.');
            loadPage('home.html');
            return;
        }

        const resultsContainer = document.getElementById('admin-results');
        resultsContainer.innerHTML = '';
        Object.keys(candidates).forEach(key => {
            const candidate = candidates[key];
            resultsContainer.innerHTML += `<p>${candidate}: ${votes[key] || 0} votes</p>`;
        });

        const ctx = document.createElement('canvas');
        ctx.classList.add('chart-container');
        resultsContainer.appendChild(ctx);
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.values(candidates),
                datasets: [{
                    label: 'Votes',
                    data: Object.keys(candidates).map(key => votes[key] || 0),
                    backgroundColor: Object.keys(candidates).map((_, index) => `hsl(${index * 60}, 70%, 50%)`)
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        setupCandidateManagement();
    }

    function setupCandidateManagement() {
        const candidateManagementContainer = document.getElementById('candidate-management');
        candidateManagementContainer.innerHTML = `
            <h3>Manage Candidates</h3>
            <form id="addCandidateForm">
                <label for="candidateName">Candidate Name:</label>
                <input type="text" id="candidateName" name="candidateName" required>
                <button type="submit">Add Candidate</button>
            </form>
            <ul id="candidateList"></ul>
        `;

        const candidateList = document.getElementById('candidateList');
        Object.keys(candidates).forEach(key => {
            const candidateItem = document.createElement('li');
            candidateItem.textContent = candidates[key];
            candidateItem.appendChild(createRemoveCandidateButton(key));
            candidateList.appendChild(candidateItem);
        });

        document.getElementById('addCandidateForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const candidateName = document.getElementById('candidateName').value;
            const candidateKey = `candidate${Object.keys(candidates).length + 1}`;
            candidates[candidateKey] = candidateName;
            localStorage.setItem('candidates', JSON.stringify(candidates));
            votes[candidateKey] = 0;
            localStorage.setItem('votes', JSON.stringify(votes));
            const candidateItem = document.createElement('li');
            candidateItem.textContent = candidateName;
            candidateItem.appendChild(createRemoveCandidateButton(candidateKey));
            candidateList.appendChild(candidateItem);
            alert('Candidate added successfully!');
        });
    }

    function createRemoveCandidateButton(candidateKey) {
        const button = document.createElement('button');
        button.textContent = 'Remove';
        button.addEventListener('click', function() {
            if (confirm(`Are you sure you want to remove ${candidates[candidateKey]}?`)) {
                delete candidates[candidateKey];
                localStorage.setItem('candidates', JSON.stringify(candidates));
                alert('Candidate removed successfully!');
                loadPage('admin.html');
            }
        });
        return button;
    }

    function showHistory() {
        const userHistoryContainer = document.getElementById('user-history');
        userHistoryContainer.innerHTML = `
            <h2>Your Voting History</h2>
            <ul id="historyList"></ul>
        `;
        const historyList = document.getElementById('historyList');
        Object.keys(hasVoted).forEach(username => {
            if (username === currentUser.username) {
                const voteItem = document.createElement('li');
                voteItem.textContent = `You have voted.`;
                historyList.appendChild(voteItem);
            }
        });
    }

    function logout() {
        currentUser = null;
        localStorage.removeItem('currentUser');
        alert('Logged out successfully.');
        loadPage('home.html');
    }

    function updateNavigation() {
        if (currentUser) {
            document.getElementById('nav-login').style.display = 'none';
            document.getElementById('nav-register').style.display = 'none';
            document.getElementById('nav-logout').style.display = 'block';
            if (currentUser.role === 'admin') {
                document.getElementById('nav-admin').style.display = 'block';
            }
        } else {
            document.getElementById('nav-login').style.display = 'block';
            document.getElementById('nav-register').style.display = 'block';
            document.getElementById('nav-logout').style.display = 'none';
            document.getElementById('nav-admin').style.display = 'none';
        }
    }

    function hashPassword(password) {
        const salt = 'somesalt';
        const saltedPassword = password + salt;
        let hash = 0;
        for (let i = 0; i < saltedPassword.length; i++) {
            hash = (hash << 5) - hash + saltedPassword.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString();
    }

    function sendEmail(recipient, message) {
        console.log(`Sending email to ${recipient}: ${message}`);
    }

    function setupSlider() {
        $('.slider').slick({
            infinite: true,
            slidesToShow: 1,
            slidesToScroll: 1,
            autoplay: true,
            autoplaySpeed: 2000,
        });
    }
});



document.addEventListener('DOMContentLoaded', function() {
    // Handle form submission for login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Example user validation (replace with actual validation logic)
            if (username === 'admin' && password === 'password123') {
                // Set a simple session flag (replace with a more secure method in production)
                sessionStorage.setItem('loggedIn', 'true');

                // Redirect to admin panel or show the admin link
                document.getElementById('admin-link').classList.remove('hidden');
                document.getElementById('logout-link').classList.remove('hidden');
                document.getElementById('login-link').classList.add('hidden');
                document.getElementById('register-link').classList.add('hidden');
                window.location.href = 'admin.html';
            } else {
                alert('Invalid username or password');
            }
        });
    }

    // Handle logout
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(event) {
            event.preventDefault();
            sessionStorage.removeItem('loggedIn');
            document.getElementById('admin-link').classList.add('hidden');
            document.getElementById('logout-link').classList.add('hidden');
            document.getElementById('login-link').classList.remove('hidden');
            document.getElementById('register-link').classList.remove('hidden');
            window.location.href = 'index.html';
        });
    }

    // Check if the user is logged in on page load
    if (sessionStorage.getItem('loggedIn') === 'true') {
        document.getElementById('admin-link').classList.remove('hidden');
        document.getElementById('logout-link').classList.remove('hidden');
        document.getElementById('login-link').classList.add('hidden');
        document.getElementById('register-link').classList.add('hidden');
    }
});
// Simulated database for demo purposes
// Simulated database for demo purposes
let users = [];
let votes = { candidate1: 0, candidate2: 0 };

// Check if user is logged in
const loggedInUser = localStorage.getItem('loggedInUser');
const adminLink = document.getElementById('admin-link');
const loginLink = document.getElementById('login-link');
const logoutLink = document.getElementById('logout-link');
const registerLink = document.getElementById('register-link');
const welcomeMessage = document.getElementById('welcome-message');

// Update UI based on login status
if (loggedInUser) {
    welcomeMessage.innerText = `Welcome back, ${loggedInUser}!`;
    loginLink.classList.add('hidden');
    registerLink.classList.add('hidden');
    logoutLink.classList.remove('hidden');
    if (loggedInUser === 'admin') {
        adminLink.classList.remove('hidden');
    }
} else {
    welcomeMessage.innerText = 'Welcome to the Advanced Electronic Voting Machine';
    loginLink.classList.remove('hidden');
    registerLink.classList.remove('hidden');
    logoutLink.classList.add('hidden');
    adminLink.classList.add('hidden');
}

// Handle logout
logoutLink.addEventListener('click', function(event) {
    event.preventDefault();
    localStorage.removeItem('loggedInUser');
    location.reload();
});

// Register user
document.getElementById('registerForm')?.addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    users.push({ username, password });
    alert('User registered successfully!');
});

// Cast vote
function castVote(candidate) {
    if (!loggedInUser) {
        alert('You must be logged in to vote.');
        return;
    }
    votes[candidate]++;
    alert(`Vote cast for ${candidate.replace('candidate', 'Candidate ')}`);
    updateResults();
}

// Update results
function updateResults() {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <p>Candidate 1: ${votes.candidate1} votes</p>
            <p>Candidate 2: ${votes.candidate2} votes</p>
        `;
    }
}

// Initial update of results
if (document.getElementById('results')) {
    updateResults();
}

// Dynamic announcements update example
const announcementImage = document.getElementById('announcement-image');
announcementImage.addEventListener('click', () => {
    alert('Announcement clicked!');
    // Here you can add dynamic content update logic, e.g., load new announcement details
    announcementImage.src = 'https://via.placeholder.com/400x200?text=New+Announcement';
    document.querySelector('#announcements p').innerText = 'This is a dynamically updated announcement.';
});

// Additional EVM functions
function resetVoting() {
    if (!loggedInUser || loggedInUser !== 'admin') {
        alert('Only the administrator can reset the voting system.');
        return;
    }

    if (confirm('Are you sure you want to reset the voting system? This will erase all votes and candidates.')) {
        votes = { candidate1: 0, candidate2: 0 };
        candidates = { candidate1: 'Candidate 1', candidate2: 'Candidate 2' };
        hasVoted = {};
        localStorage.setItem('votes', JSON.stringify(votes));
        localStorage.setItem('candidates', JSON.stringify(candidates));
        localStorage.setItem('hasVoted', JSON.stringify(hasVoted));
        alert('Voting system reset successfully!');
        loadPage('admin.html');
    }
}

function viewAllVotes() {
    if (!loggedInUser || loggedInUser !== 'admin') {
        alert('Only the administrator can view all votes.');
        return;
    }

    const votesContainer = document.getElementById('all-votes');
    votesContainer.innerHTML = '<h2>All Votes</h2>';
    for (const username in hasVoted) {
        if (hasVoted[username]) {
            votesContainer.innerHTML += `<p>${username} voted for ${candidates[Object.keys(votes).find(key => votes[key] > 0)]}</p>`;
        }
    }
}

function exportVotes() {
    if (!loggedInUser || loggedInUser !== 'admin') {
        alert('Only the administrator can export votes.');
        return;
    }

    const data = `Candidate,Votes\n${Object.keys(candidates).map(key => `${candidates[key]},${votes[key] || 0}`).join('\n')}`;
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'votes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add event listeners for the new functions
document.getElementById('reset-voting-button')?.addEventListener('click', resetVoting);
document.getElementById('view-all-votes-button')?.addEventListener('click', viewAllVotes);
document.getElementById('export-votes-button')?.addEventListener('click', exportVotes);



document.addEventListener('DOMContentLoaded', function() {
    const content = document.getElementById('content');
    let votes = JSON.parse(localStorage.getItem('votes')) || {};
    let users = JSON.parse(localStorage.getItem('users')) || { admin: { password: hashPassword('admin'), role: 'admin' } };
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let hasVoted = JSON.parse(localStorage.getItem('hasVoted')) || {};
    let candidates = JSON.parse(localStorage.getItem('candidates')) || { candidate1: 'Candidate 1', candidate2: 'Candidate 2' };
    let electionClosed = false; // Flag to indicate if the election is closed
    let electionEndTime = null; // Stores the election end time (for the timer)

    // ... (rest of your existing code) ...

    function setupVoting() {
        // Check if the election is closed
        if (electionClosed) {
            alert('The election has closed.');
            loadPage('results.html');
            return;
        }

        // ... (rest of your voting setup code) ...
    }

    // ... (rest of your existing code) ...

    function setupAdmin() {
        // ... (rest of your admin setup code) ...

        // Add Election Timer to the Admin Panel
        const electionTimerDiv = document.createElement('div');
        electionTimerDiv.id = 'election-timer';
        electionTimerDiv.innerHTML = '<p>Election Ends in: <span id="timer"></span></p>';
        candidateManagementContainer.appendChild(electionTimerDiv);

        // Set up the election timer (if electionEndTime is defined)
        if (electionEndTime) {
            startElectionTimer();
        }

        // ... (rest of your admin setup code) ...
    }

    // Function to start the election timer
    function startElectionTimer() {
        const timerElement = document.getElementById('timer');
        const intervalId = setInterval(() => {
            const now = new Date();
            const timeRemaining = electionEndTime - now;
            if (timeRemaining > 0) {
                const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                clearInterval(intervalId);
                electionClosed = true;
                alert('The election has closed!');
                // Load the results page or update the UI appropriately
                loadPage('results.html');
            }
        }, 1000); // Update every second
    }

    // Function to close the election (can be called from admin panel)
    function closeElection() {
        if (!loggedInUser || loggedInUser !== 'admin') {
            alert('Only the administrator can close the election.');
            return;
        }
        if (confirm('Are you sure you want to close the election?')) {
            electionClosed = true;
            alert('The election has closed!');
            loadPage('results.html'); // Load the results page
        }
    }

    // Function to change vote (before election closed)
    function changeVote(candidate) {
        if (!loggedInUser) {
            alert('You must be logged in to vote.');
            return;
        }
        if (electionClosed) {
            alert('The election has closed.');
            return;
        }
        if (confirm(`Are you sure you want to change your vote to ${candidates[candidate]}?`)) {
            // Find the current vote and remove it
            for (const key in votes) {
                if (votes[key] && hasVoted[currentUser.username]) {
                    votes[key]--;
                    break;
                }
            }
            // Cast the new vote
            votes[candidate]++;
            localStorage.setItem('votes', JSON.stringify(votes));
            alert(`Vote changed to ${candidates[candidate]}`);
            loadPage('results.html');
        }
    }

    // ... (rest of your existing code) ...

    // Function to validate password strength (during registration)
    function validatePasswordStrength(password) {
        const strength = {
            weak: 0,
            medium: 1,
            strong: 2
        };
        let score = strength.weak;
        if (password.length >= 8) {
            score = strength.medium;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)) {
                score = strength.strong;
            }
        }
        return score;
    }

    // ... (rest of your existing code) ...

    // Function to display real-time vote count
    function updateRealTimeVoteCount() {
        const voteCountElement = document.getElementById('vote-count');
        if (voteCountElement) {
            const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
            voteCountElement.textContent = `Total Votes: ${totalVotes}`;
        }
    }

    // ... (rest of your existing code) ...

    // Add a real-time vote count display on the results page
    function showResults() {
        // ... (rest of your results display code) ...

        // Add a real-time vote count display
        const voteCountDiv = document.createElement('div');
        voteCountDiv.id = 'vote-count';
        resultsContainer.appendChild(voteCountDiv);
        updateRealTimeVoteCount(); // Initial update
        setInterval(updateRealTimeVoteCount, 1000); // Update every second
    }

    // ... (rest of your existing code) ...

    // Add a button to change vote on the results page
    function showResults() {
        // ... (rest of your results display code) ...

        // Add a change vote button 
        const changeVoteButton = document.createElement('button');
        changeVoteButton.id = 'change-vote-button';
        changeVoteButton.textContent = 'Change Vote';
        changeVoteButton.addEventListener('click', () => {
            // Implement your logic to display a list of candidates
            // for the user to choose from, and then call
            // changeVote(selectedCandidate) when the user makes a selection.
            alert('This feature is not yet implemented. Please check your code.');
        });
        resultsContainer.appendChild(changeVoteButton);
    }

    // ... (rest of your existing code) ...

    // Add a function to set up the election end time in the admin panel
    function setupAdmin() {
        // ... (rest of your admin setup code) ...

        // Add Election End Time Setting
        const endTimeForm = document.createElement('form');
        endTimeForm.id = 'election-end-time-form';
        endTimeForm.innerHTML = `
            <h3>Set Election End Time</h3>
            <label for="endTime">End Time:</label>
            <input type="datetime-local" id="endTime" name="endTime" required><br>
            <button type="submit">Set End Time</button>
        `;
        candidateManagementContainer.appendChild(endTimeForm);

        endTimeForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const endTimeInput = document.getElementById('endTime');
            const endTimeString = endTimeInput.value;
            electionEndTime = new Date(endTimeString);
            localStorage.setItem('electionEndTime', endTimeString);
            startElectionTimer();
            alert('Election end time set!');
        });

        // ... (rest of your admin setup code) ...
    }

    // Load the election end time from local storage
    if (localStorage.getItem('electionEndTime')) {
        electionEndTime = new Date(localStorage.getItem('electionEndTime'));
    }

    // ... (rest of your existing code) ...

    // Add error handling for invalid user login
    function setupLogin() {
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            if (users[username] && users[username].password === hashPassword(password)) {
                currentUser = { username, role: users[username].role };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                alert('Login successful!');
                loadPage('vote.html');
            } else {
                alert('Invalid username or password.');
                // Optionally, you could redirect the user back to the login page
                // loadPage('login.html'); 
            }
        });
    }

    // ... (rest of your existing code) ...

    // Add error handling for invalid user registration
    function setupRegister() {
        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            if (!users[username]) {
                users[username] = { password: hashPassword(password), role: 'user' };
                localStorage.setItem('users', JSON.stringify(users));
                alert('Registration successful!');
                sendEmail(username, 'Welcome to the Advanced Electronic Voting Machine!');
                loadPage('login.html');
            } else {
                alert('Username already exists.');
                // Optionally, you could redirect the user back to the registration page
                // loadPage('register.html'); 
            }
        });
    }

    // ... (rest of your existing code) ...

    // Add error handling for invalid candidate management
    function setupCandidateManagement() {
        // ... (rest of your candidate management setup code) ...

        document.getElementById('addCandidateForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const candidateName = document.getElementById('candidateName').value;
            if (candidateName.trim() === '') {
                alert('Please enter a valid candidate name.');
                return;
            }
            const candidateKey = `candidate${Object.keys(candidates).length + 1}`;
            candidates[candidateKey] = candidateName;
            localStorage.setItem('candidates', JSON.stringify(candidates));
            votes[candidateKey] = 0;
            localStorage.setItem('votes', JSON.stringify(votes));
            const candidateItem = document.createElement('li');
            candidateItem.textContent = candidateName;
            candidateItem.appendChild(createRemoveCandidateButton(candidateKey));
            candidateList.appendChild(candidateItem);
            alert('Candidate added successfully!');
        });

        // ... (rest of your candidate management setup code) ...
    }

    // ... (rest of your existing code) ...

    // Add a function to display the user's voting history
    function showHistory() {
        const userHistoryContainer = document.getElementById('user-history');
        userHistoryContainer.innerHTML = `
            <h2>Your Voting History</h2>
            <ul id="historyList"></ul>
        `;
        const historyList = document.getElementById('historyList');
        Object.keys(hasVoted).forEach(username => {
            if (username === currentUser.username) {
                const historyItem = document.createElement('li');
                historyItem.textContent = hasVoted[username] ? 'Voted' : 'Not Voted';
                historyList.appendChild(historyItem);
            }
        });
    }

    // ... (rest of your existing code) ...

    // Add a function to clear the voting history
    function clearVotingHistory() {
        if (!loggedInUser || loggedInUser !== 'admin') {
            alert('Only the administrator can clear the voting history.');
            return;
        }
        if (confirm('Are you sure you want to clear the voting history?')) {
            hasVoted = {};
            localStorage.setItem('hasVoted', JSON.stringify(hasVoted));
            alert('Voting history cleared.');
            loadPage('admin.html');
        }
    }

    // Add a button to clear voting history to the admin panel
    function setupAdmin() {
        // ... (rest of your admin setup code) ...

        // Add Clear Voting History Button
        const clearHistoryButton = document.createElement('button');
        clearHistoryButton.id = 'clear-history-button';
        clearHistoryButton.textContent = 'Clear Voting History';
        clearHistoryButton.addEventListener('click', clearVotingHistory);
        candidateManagementContainer.appendChild(clearHistoryButton);

        // ... (rest of your admin setup code) ...
    }

    // ... (rest of your existing code) ...
});
document.addEventListener('DOMContentLoaded', function() {
    const content = document.getElementById('content');
    let votes = JSON.parse(localStorage.getItem('votes')) || {};
    let users = JSON.parse(localStorage.getItem('users')) || { admin: { password: hashPassword('admin'), role: 'admin' } };
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let hasVoted = JSON.parse(localStorage.getItem('hasVoted')) || {};
    let candidates = JSON.parse(localStorage.getItem('candidates')) || { candidate1: 'Candidate 1', candidate2: 'Candidate 2' };
    let electionClosed = false; // Flag to indicate if the election is closed
    let electionEndTime = null; // Stores the election end time (for the timer)

    function loadPage(page) {
        fetch(page)
            .then(response => response.text())
            .then(data => {
                content.innerHTML = data;
                if (page === 'vote.html') {
                    setupVoting();
                } else if (page === 'results.html') {
                    showResults();
                } else if (page === 'login.html') {
                    setupLogin();
                } else if (page === 'register.html') {
                    setupRegister();
                } else if (page === 'admin.html') {
                    setupAdmin();
                } else if (page === 'history.html') {
                    showHistory();
                }
                updateNavigation();
            })
            .catch(error => console.error('Error loading page:', error));
    }

    document.querySelectorAll('nav ul li a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = link.getAttribute('href');
            if ((page === 'vote.html' && !currentUser) || (page === 'admin.html' && (!currentUser || currentUser.role !== 'admin'))) {
                loadPage('login.html');
            } else {
                loadPage(page);
            }
        });
    });

    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });

    loadPage('index.html');

    function setupVoting() {
        if (electionClosed) {
            alert('The election has closed.');
            loadPage('results.html');
            return;
        }

        if (hasVoted[currentUser.username]) {
            alert('You have already voted.');
            loadPage('results.html');
            return;
        }

        const votingContainer = document.getElementById('voting-container');
        votingContainer.innerHTML = '';
        Object.keys(candidates).forEach(key => {
            const candidate = candidates[key];
            const voteOption = document.createElement('div');
            voteOption.classList.add('vote-option');
            voteOption.setAttribute('data-candidate', key);
            voteOption.innerHTML = `
                <h2>${candidate}</h2>
                <p>Description of ${candidate}.</p>
            `;
            voteOption.addEventListener('click', function() {
                const candidateKey = this.getAttribute('data-candidate');
                if (confirm(`Are you sure you want to vote for ${candidates[candidateKey]}?`)) {
                    votes[candidateKey] = (votes[candidateKey] || 0) + 1;
                    localStorage.setItem('votes', JSON.stringify(votes));
                    hasVoted[currentUser.username] = true;
                    localStorage.setItem('hasVoted', JSON.stringify(hasVoted));
                    alert('Vote recorded for ' + candidates[candidateKey] + '!');
                    sendEmail(currentUser.username, `You have successfully voted for ${candidates[candidateKey]}`);
                    loadPage('results.html');
                }
            });
            votingContainer.appendChild(voteOption);
        });
    }

    function showResults() {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';
        Object.keys(candidates).forEach(key => {
            const candidate = candidates[key];
            resultsContainer.innerHTML += `<p>${candidate}: ${votes[key] || 0} votes</p>`;
        });

        const ctx = document.createElement('canvas');
        ctx.classList.add('chart-container');
        resultsContainer.appendChild(ctx);
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.values(candidates),
                datasets: [{
                    data: Object.keys(candidates).map(key => votes[key] || 0),
                    backgroundColor: Object.keys(candidates).map((_, index) => `hsl(${index * 60}, 70%, 50%)`)
                }]
            }
        });

        const voteCountDiv = document.createElement('div');
        voteCountDiv.id = 'vote-count';
        resultsContainer.appendChild(voteCountDiv);
        updateRealTimeVoteCount(); // Initial update
        setInterval(updateRealTimeVoteCount, 1000); // Update every second

        const changeVoteButton = document.createElement('button');
        changeVoteButton.id = 'change-vote-button';
        changeVoteButton.textContent = 'Change Vote';
        changeVoteButton.addEventListener('click', () => {
            // Implement your logic to display a list of candidates
            // for the user to choose from, and then call
            // changeVote(selectedCandidate) when the user makes a selection.
            alert('This feature is not yet implemented. Please check your code.');
        });
        resultsContainer.appendChild(changeVoteButton);
    }

    function setupLogin() {
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            if (users[username] && users[username].password === hashPassword(password)) {
                currentUser = { username, role: users[username].role };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                alert('Login successful!');
                loadPage('index.html');
            } else {
                alert('Invalid username or password.');
                // Optionally, you could redirect the user back to the login page
                // loadPage('login.html'); 
            }
        });
    }

    function setupRegister() {
        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            if (!users[username]) {
                users[username] = { password: hashPassword(password), role: 'user' };
                localStorage.setItem('users', JSON.stringify(users));
                alert('Registration successful!');
                sendEmail(username, 'Welcome to the Advanced Electronic Voting Machine!');
                loadPage('login.html');
            } else {
                alert('Username already exists.');
                // Optionally, you could redirect the user back to the registration page
                // loadPage('register.html'); 
            }
        });
    }

    function setupAdmin() {
        if (currentUser.role !== 'admin') {
            alert('Access denied.');
            loadPage('index.html');
            return;
        }

        const resultsContainer = document.getElementById('admin-results');
        resultsContainer.innerHTML = '';
        Object.keys(candidates).forEach(key => {
            const candidate = candidates[key];
            resultsContainer.innerHTML += `<p>${candidate}: ${votes[key] || 0} votes</p>`;
        });

        const ctx = document.createElement('canvas');
        ctx.classList.add('chart-container');
        resultsContainer.appendChild(ctx);
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.values(candidates),
                datasets: [{
                    label: 'Votes',
                    data: Object.keys(candidates).map(key => votes[key] || 0),
                    backgroundColor: Object.keys(candidates).map((_, index) => `hsl(${index * 60}, 70%, 50%)`)
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        const candidateManagementContainer = document.getElementById('candidate-management');
        candidateManagementContainer.innerHTML = `
            <h3>Manage Candidates</h3>
            <form id="addCandidateForm">
                <label for="candidateName">Candidate Name:</label>
                <input type="text" id="candidateName" name="candidateName" required>
                <button type="submit">Add Candidate</button>
            </form>
            <ul id="candidateList"></ul>
        `;

        const candidateList = document.getElementById('candidateList');
        Object.keys(candidates).forEach(key => {
            const candidateItem = document.createElement('li');
            candidateItem.textContent = candidates[key];
            candidateItem.appendChild(createRemoveCandidateButton(key));
            candidateList.appendChild(candidateItem);
        });

        document.getElementById('addCandidateForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const candidateName = document.getElementById('candidateName').value;
            if (candidateName.trim() === '') {
                alert('Please enter a valid candidate name.');
                return;
            }
            const candidateKey = `candidate${Object.keys(candidates).length + 1}`;
            candidates[candidateKey] = candidateName;
            localStorage.setItem('candidates', JSON.stringify(candidates));
            votes[candidateKey] = 0;
            localStorage.setItem('votes', JSON.stringify(votes));
            const candidateItem = document.createElement('li');
            candidateItem.textContent = candidateName;
            candidateItem.appendChild(createRemoveCandidateButton(candidateKey));
            candidateList.appendChild(candidateItem);
            alert('Candidate added successfully!');
        });

        const electionTimerDiv = document.createElement('div');
        electionTimerDiv.id = 'election-timer';
        electionTimerDiv.innerHTML = '<p>Election Ends in: <span id="timer"></span></p>';
        candidateManagementContainer.appendChild(electionTimerDiv);

        if (electionEndTime) {
            startElectionTimer();
        }

        const endTimeForm = document.createElement('form');
        endTimeForm.id = 'election-end-time-form';
        endTimeForm.innerHTML = `
            <h3>Set Election End Time</h3>
            <label for="endTime">End Time:</label>
            <input type="datetime-local" id="endTime" name="endTime" required><br>
            <button type="submit">Set End Time</button>
        `;
        candidateManagementContainer.appendChild(endTimeForm);

        endTimeForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const endTimeInput = document.getElementById('endTime');
            const endTimeString = endTimeInput.value;
            electionEndTime = new Date(endTimeString);
            localStorage.setItem('electionEndTime', endTimeString);
            startElectionTimer();
            alert('Election end time set!');
        });

        const clearHistoryButton = document.createElement('button');
        clearHistoryButton.id = 'clear-history-button';
        clearHistoryButton.textContent = 'Clear Voting History';
        clearHistoryButton.addEventListener('click', clearVotingHistory);
        candidateManagementContainer.appendChild(clearHistoryButton);
    }

    function createRemoveCandidateButton(candidateKey) {
        const button = document.createElement('button');
        button.textContent = 'Remove';
        button.addEventListener('click', function() {
            if (confirm(`Are you sure you want to remove ${candidates[candidateKey]}?`)) {
                delete candidates[candidateKey];
                localStorage.setItem('candidates', JSON.stringify(candidates));
                alert('Candidate removed successfully!');
                loadPage('admin.html');
            }
        });
        return button;
    }

    function showHistory() {
        const userHistoryContainer = document.getElementById('user-history');
        userHistoryContainer.innerHTML = `
            <h2>Your Voting History</h2>
            <ul id="historyList"></ul>
        `;
        const historyList = document.getElementById('historyList');
        Object.keys(hasVoted).forEach(username => {
            if (username === currentUser.username) {
                const historyItem = document.createElement('li');
                historyItem.textContent = hasVoted[username] ? 'Voted' : 'Not Voted';
                historyList.appendChild(historyItem);
            }
        });
    }

    function logout() {
        currentUser = null;
        localStorage.removeItem('currentUser');
        alert('You have logged out.');
        loadPage('index.html');
    }

    function updateNavigation() {
        document.getElementById('logout-link').classList.toggle('hidden', !currentUser);
        document.getElementById('login-link').classList.toggle('hidden', currentUser);
        document.getElementById('register-link').classList.toggle('hidden', currentUser);
        document.getElementById('admin-link').classList.toggle('hidden', !currentUser || currentUser.role !== 'admin');
        document.getElementById('history-link').classList.toggle('hidden', !currentUser);
    }

    function hashPassword(password) {
        return password.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
    }

    function sendEmail(username, message) {
        console.log(`Sending email to ${username}: ${message}`);
        setTimeout(() => alert(`Email sent to ${username}`), 1000);
    }

    function startElectionTimer() {
        const timerElement = document.getElementById('timer');
        const intervalId = setInterval(() => {
            const now = new Date();
            const timeRemaining = electionEndTime - now;
            if (timeRemaining > 0) {
                const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                clearInterval(intervalId);
                electionClosed = true;
                alert('The election has closed!');
                // Load the results page or update the UI appropriately
                loadPage('results.html');
            }
        }, 1000); // Update every second
    }

    function closeElection() {
        if (!loggedInUser || loggedInUser !== 'admin') {
            alert('Only the administrator can close the election.');
            return;
        }
        if (confirm('Are you sure you want to close the election?')) {
            electionClosed = true;
            alert('The election has closed!');
            loadPage('results.html'); // Load the results page
        }
    }

    function changeVote(candidate) {
        if (!loggedInUser) {
            alert('You must be logged in to vote.');
            return;
        }
        if (electionClosed) {
            alert('The election has closed.');
            return;
        }
        if (confirm(`Are you sure you want to change your vote to ${candidates[candidate]}?`)) {
            // Find the current vote and remove it
            for (const key in votes) {
                if (votes[key] && hasVoted[currentUser.username]) {
                    votes[key]--;
                    break;
                }
            }
            // Cast the new vote
            votes[candidate]++;
            localStorage.setItem('votes', JSON.stringify(votes));
            alert(`Vote changed to ${candidates[candidate]}`);
            loadPage('results.html');
        }
    }

    function validatePasswordStrength(password) {
        const strength = {
            weak: 0,
            medium: 1,
            strong: 2
        };
        let score = strength.weak;
        if (password.length >= 8) {
            score = strength.medium;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)) {
                score = strength.strong;
            }
        }
        return score;
    }

    function updateRealTimeVoteCount() {
        const voteCountElement = document.getElementById('vote-count');
        if (voteCountElement) {
            const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
            voteCountElement.textContent = `Total Votes: ${totalVotes}`;
        }
    }

    function clearVotingHistory() {
        if (!loggedInUser || loggedInUser !== 'admin') {
            alert('Only the administrator can clear the voting history.');
            return;
        }
        if (confirm('Are you sure you want to clear the voting history?')) {
            hasVoted = {};
            localStorage.setItem('hasVoted', JSON.stringify(hasVoted));
            alert('Voting history cleared.');
            loadPage('admin.html');
        }
    }

    // Load the election end time from local storage
    if (localStorage.getItem('electionEndTime')) {
        electionEndTime = new Date(localStorage.getItem('electionEndTime'));
    }
});

// ... (Your existing code) ...

function setupVoting() {
    if (electionClosed) {
        alert('The election has closed.');
        loadPage('results.html');
        return;
    }

    if (hasVoted[currentUser.username]) {
        alert('You have already voted.');
        loadPage('results.html');
        return;
    }

    const votingContainer = document.getElementById('voting-container');
    votingContainer.innerHTML = '';
    Object.keys(candidates).forEach(key => {
        const candidate = candidates[key];
        const voteOption = document.createElement('div');
        voteOption.classList.add('vote-option');
        voteOption.setAttribute('data-candidate', key);
        voteOption.innerHTML = `
            <h2>${candidate}</h2>
            <p>Description of ${candidate}.</p>
            <button class="view-profile" data-candidate="${key}">View Profile</button>
        `;
        voteOption.addEventListener('click', function() {
            const candidateKey = this.getAttribute('data-candidate');
            if (confirm(`Are you sure you want to vote for ${candidates[candidateKey]}?`)) {
                votes[candidateKey] = (votes[candidateKey] || 0) + 1;
                localStorage.setItem('votes', JSON.stringify(votes));
                hasVoted[currentUser.username] = true;
                localStorage.setItem('hasVoted', JSON.stringify(hasVoted));
                alert('Vote recorded for ' + candidates[candidateKey] + '!');
                sendEmail(currentUser.username, `You have successfully voted for ${candidates[candidateKey]}`);
                loadPage('results.html');
            }
        });

        // Add event listener to the "View Profile" button
        voteOption.querySelector('.view-profile').addEventListener('click', function() {
            const candidateKey = this.dataset.candidate;
            showCandidateProfile(candidateKey);
        });

        votingContainer.appendChild(voteOption);
    });
}

// Function to display the candidate profile
function showCandidateProfile(candidateKey) {
    const candidate = candidates[candidateKey];
    const profileContent = `
        <h2>${candidate}</h2>
        <p><strong>Biography:</strong> Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas sed diam eget risus varius blandit sit amet non magna. </p>
        <p><strong>Platform:</strong> Proin eget tortor risus. Donec ullamcorper nulla non metus auctor fringilla. </p>
        <p><strong>Contact:</strong> candidate@example.com</p>
    `;

    // You can load the candidate profile content from local storage or an API here
    // ...

    // Display the profile content in a modal or a separate page
    // Here's an example using a modal
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            ${profileContent}
        </div>
    `;
    document.body.appendChild(modal);

    // Add event listener to close the modal
    modal.querySelector('.close-button').addEventListener('click', () => {
        modal.remove();
    });
}

// ... (Rest of your existing code) ...

// Update candidate management to include a profile field
function setupCandidateManagement() {
    const candidateManagementContainer = document.getElementById('candidate-management');
    candidateManagementContainer.innerHTML = `
        <h3>Manage Candidates</h3>
        <form id="addCandidateForm">
            <label for="candidateName">Candidate Name:</label>
            <input type="text" id="candidateName" name="candidateName" required>
            <label for="candidateProfile">Candidate Profile:</label>
            <textarea id="candidateProfile" name="candidateProfile"></textarea>
            <button type="submit">Add Candidate</button>
        </form>
        <ul id="candidateList"></ul>
    `;

    // ... (Rest of your existing code) ...

    document.getElementById('addCandidateForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const candidateName = document.getElementById('candidateName').value;
        const candidateProfile = document.getElementById('candidateProfile').value;

        if (candidateName.trim() === '') {
            alert('Please enter a valid candidate name.');
            return;
        }

        const candidateKey = `candidate${Object.keys(candidates).length + 1}`;
        candidates[candidateKey] = candidateName;
        localStorage.setItem('candidates', JSON.stringify(candidates));
        votes[candidateKey] = 0;
        localStorage.setItem('votes', JSON.stringify(votes));

        // Store candidate profile
        const candidateProfileData = {
            [candidateKey]: candidateProfile
        };
        localStorage.setItem('candidateProfiles', JSON.stringify(candidateProfileData));

        const candidateItem = document.createElement('li');
        candidateItem.textContent = candidateName;
        candidateItem.appendChild(createRemoveCandidateButton(candidateKey));
        candidateList.appendChild(candidateItem);
        alert('Candidate added successfully!');
    });

    // ... (Rest of your existing code) ...
}

// ... (Your existing code in scripts.js) ...

// Function to fetch and display candidate profile
async function showCandidateProfile(candidateKey) {
    try {
        const candidate = candidates[candidateKey];

        // Fetch profile data from the internet (replace with your API call)
        const response = await fetch(`https://api.example.com/candidates/${candidateKey}`);
        const profileData = await response.json();

        // Construct the profile content from the fetched data
        const profileContent = `
            <h2>${candidate}</h2>
            <p><strong>Biography:</strong> ${profileData.biography}</p>
            <p><strong>Platform:</strong> ${profileData.platform}</p>
            <p><strong>Contact:</strong> ${profileData.contact}</p>
            <img src="${profileData.imageUrl}" alt="${candidate} Profile Picture" class="profile-image">
        `;

        // Display the profile content in a modal
        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-button">&times;</span>
                ${profileContent}
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listener to close the modal
        modal.querySelector('.close-button').addEventListener('click', () => {
            modal.remove();
        });

    } catch (error) {
        console.error("Error fetching candidate profile:", error);
        alert("Error loading candidate profile. Please try again later.");
    }
}

// ... (Rest of your existing code) ...
// Function to validate a user's vote (ensure they haven't voted already and the election is open)
function validateVote() {
    if (electionClosed) {
        alert('The election has closed.');
        return false;
    }
    if (hasVoted[currentUser.username]) {
        alert('You have already voted.');
        return false;
    }
    return true;
}

// Function to update the UI for the vote page
function updateVotePageUI() {
    const votingContainer = document.getElementById('voting-container');
    votingContainer.innerHTML = '';
    Object.keys(candidates).forEach(key => {
        const candidate = candidates[key];
        const voteOption = document.createElement('div');
        voteOption.classList.add('vote-option');
        voteOption.setAttribute('data-candidate', key);
        voteOption.innerHTML = `
            <h2>${candidate}</h2>
            <p>Description of ${candidate}.</p>
            <button class="view-profile" data-candidate="${key}">View Profile</button>
            <button class="cast-vote" data-candidate="${key}">Vote</button>
        `;
        // ... (rest of your voteOption setup logic) ...
        votingContainer.appendChild(voteOption);
    });
}

// Function to handle vote casting
function handleVoteCast(candidateKey) {
    if (!validateVote()) {
        return;
    }
    if (confirm(`Are you sure you want to vote for ${candidates[candidateKey]}?`)) {
        votes[candidateKey] = (votes[candidateKey] || 0) + 1;
        localStorage.setItem('votes', JSON.stringify(votes));
        hasVoted[currentUser.username] = true;
        localStorage.setItem('hasVoted', JSON.stringify(hasVoted));
        alert('Vote recorded for ' + candidates[candidateKey] + '!');
        sendEmail(currentUser.username, `You have successfully voted for ${candidates[candidateKey]}`);
        loadPage('results.html');
    }
}

// Update the setupVoting function to use the new functions
function setupVoting() {
    if (electionClosed) {
        alert('The election has closed.');
        loadPage('results.html');
        return;
    }
    updateVotePageUI();

    // Add event listeners to the vote buttons
    const voteButtons = document.querySelectorAll('.cast-vote');
    voteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const candidateKey = button.dataset.candidate;
            handleVoteCast(candidateKey);
        });
    });
}

// Function to dynamically update the results page
function updateResultsPageUI() {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';
    Object.keys(candidates).forEach(key => {
        const candidate = candidates[key];
        resultsContainer.innerHTML += `<p>${candidate}: ${votes[key] || 0} votes</p>`;
    });
    // ... (rest of your results page update logic) ...
}

// Update the showResults function to use the new function
function showResults() {
    updateResultsPageUI();
    // ... (rest of your showResults function) ...
}

// Function to display a message on the home page depending on the election status
function updateHomePageUI() {
    const homeMessage = document.getElementById('home-message');
    if (homeMessage) {
        if (electionClosed) {
            homeMessage.textContent = 'The election has closed. View results!';
        } else {
            homeMessage.textContent = 'Welcome to the Advanced Electronic Voting Machine!';
        }
    }
}

// Update the loadPage function to update the home page UI
function loadPage(page) {
    fetch(page)
        .then(response => response.text())
        .then(data => {
            content.innerHTML = data;
            if (page === 'vote.html') {
                setupVoting();
            } else if (page === 'results.html') {
                showResults();
            } else if (page === 'home.html') {
                updateHomePageUI();
            }
            // ... (rest of your loadPage function logic) ...
        })
        .catch(error => console.error('Error loading page:', error));
}



document.addEventListener('DOMContentLoaded', () => {
    // Election Timer
    const timerValue = document.getElementById('timer-value');
    const electionEndTime = new Date('2024-12-31T23:59:59Z'); // Set your election end time here

    const updateTimer = () => {
        const now = new Date();
        const timeRemaining = electionEndTime - now;

        if (timeRemaining > 0) {
            const hours = String(Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
            const minutes = String(Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            const seconds = String(Math.floor((timeRemaining % (1000 * 60)) / 1000)).padStart(2, '0');
            timerValue.textContent = `${hours}:${minutes}:${seconds}`;
        } else {
            timerValue.textContent = '00:00:00';
        }
    };

    setInterval(updateTimer, 1000);

    // Profile Form Submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const bio = document.getElementById('bio').value;

            console.log(`Username: ${username}, Email: ${email}, Bio: ${bio}`);
            // Add your form submission logic here
        });
    }

    // Fetch and Display Voting History
    const userHistoryTable = document.querySelector('#user-history tbody');
    if (userHistoryTable) {
        fetch('/user-history')
            .then(response => response.json())
            .then(data => {
                userHistoryTable.innerHTML = data.history.map(entry => `
                    <tr>
                        <td>${entry.election}</td>
                        <td>${entry.candidate}</td>
                        <td>${entry.date}</td>
                    </tr>
                `).join('');
            })
            .catch(error => console.error('Error fetching history:', error));
    }

    // Fetch and Display Voting Results in Chart
    const resultsChartCtx = document.getElementById('resultsChart');
    if (resultsChartCtx) {
        fetch('/admin-results')
            .then(response => response.json())
            .then(data => {
                const resultsChart = new Chart(resultsChartCtx, {
                    type: 'bar',
                    data: {
                        labels: data.results.map(result => result.candidate),
                        datasets: [{
                            label: 'Votes',
                            data: data.results.map(result => result.votes),
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            })
            .catch(error => console.error('Error fetching results:', error));
    }

    // Existing Login/Logout Logic
    const navMenu = document.getElementById("nav-menu");
    const loginLink = document.getElementById("login-link");
    const logoutLink = document.getElementById("logout-link");

    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn === "true") {
        loginLink.classList.add("hidden");
        logoutLink.classList.remove("hidden");
    } else {
        logoutLink.classList.add("hidden");
        loginLink.classList.remove("hidden");
    }

    logoutLink.addEventListener("click", () => {
        localStorage.removeItem("isLoggedIn");
        loginLink.classList.remove("hidden");
        logoutLink.classList.add("hidden");
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Dark Mode Toggle (if applicable)
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }

    // Registration Form Handling (if applicable)
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            registerUser(username, password);
        });
    }

    // Inject Voting History
    const userHistoryContainer = document.querySelector('#user-history tbody');
    if (userHistoryContainer) {
        displayVotingHistory(userHistoryContainer);
    }

    // Display Results (if applicable)
    const resultsContainer = document.getElementById('results');
    if (resultsContainer) {
        displayResults(resultsContainer);
    }

    // Change Vote Button Handling (if applicable)
    const changeVoteButton = document.getElementById('change-vote-button');
    if (changeVoteButton) {
        changeVoteButton.addEventListener('click', () => {
            window.location.href = 'vote.html';
        });
    }
});

// Function to register a new user
function registerUser(username, password) {
    // Here you would typically send a request to your server to register the user
    // For demonstration purposes, we are just logging the data to the console
    console.log('User registered:', { username, password });
    alert('Registration successful!');
    // Redirect to login page after registration
    window.location.href = 'login.html';
}

// Function to display voting history
function displayVotingHistory(container) {
    // Sample data - in a real application, fetch this from your server
    const votingHistory = [
        { election: 'Presidential Election 2024', candidate: 'Candidate A', date: '2024-11-05' },
        { election: 'Midterm Election 2022', candidate: 'Candidate B', date: '2022-11-08' }
    ];
    
    if (votingHistory.length === 0) {
        const noHistoryMessage = document.createElement('tr');
        noHistoryMessage.innerHTML = '<td colspan="3">No voting history available.</td>';
        container.appendChild(noHistoryMessage);
        return;
    }
    
    votingHistory.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${record.election}</td><td>${record.candidate}</td><td>${record.date}</td>`;
        container.appendChild(row);
    });
}

// Function to display results (if applicable)
function displayResults(container) {
    // Sample data - in a real application, fetch this from your server
    const results = {
        election: 'Presidential Election 2024',
        candidates: [
            { name: 'Candidate A', votes: 1200 },
            { name: 'Candidate B', votes: 950 }
        ]
    };

    const resultsHeader = document.createElement('h3');
    resultsHeader.textContent = results.election;
    container.appendChild(resultsHeader);

    const resultsList = document.createElement('ul');
    results.candidates.forEach(candidate => {
        const listItem = document.createElement('li');
        listItem.textContent = `${candidate.name}: ${candidate.votes} votes`;
        resultsList.appendChild(listItem);
    });
    container.appendChild(resultsList);
    
    // Display total votes
    const voteCountContainer = document.getElementById('vote-count');
    const totalVotes = results.candidates.reduce((total, candidate) => total + candidate.votes, 0);
    voteCountContainer.textContent = `Total Votes: ${totalVotes}`;
}

