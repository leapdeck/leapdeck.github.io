const option1 = document.querySelector(".option1");
const option2 = document.querySelector(".option2");
const option3 = document.querySelector(".option3");
const option4 = document.querySelector(".option4");
const option5 = document.querySelector(".option5");

const q1 = document.querySelector(".q1");
const q2 = document.querySelector(".q2");
const q3 = document.querySelector(".q3");
const q4 = document.querySelector(".q4");
const q5 = document.querySelector(".q5");

const Survey = document.querySelector(".Survey");
const end = document.querySelector(".end");

// Store survey answers
const answers = {};

// Question texts
const questions = {
    q1: "Do you want to know more about A.I. on your local desktop, instead of cloud-based?",
    q2: "Would like more info on creating prompts?",
    q3: "Do you want to know more about A.I. agents?",
    q4: "Are you interested in advanced methods like RAG to improve A.I. results?",
    q5: "Would you like comparison tutorials for choosing between different AI models?"
};

// Transition function with card slide animation
function transitionQuestion(currentQ, nextQ) {
    // Slide card out to the right
    Survey.classList.add('slide-out-right');
    
    // Wait for slide out animation
    setTimeout(() => {
        // Switch questions
        currentQ.style.display = "none";
        nextQ.style.display = "block";
        
        // Position card off-screen to the left
        Survey.classList.remove('slide-out-right');
        Survey.classList.add('slide-in-left');
        
        // Trigger slide in from left
        setTimeout(() => {
            Survey.classList.remove('slide-in-left');
        }, 50);
    }, 750);
}

// Go back to previous question
function goBack(previousQuestionNumber) {
    const currentQ = document.querySelector('.q' + (previousQuestionNumber + 1));
    const previousQ = document.querySelector('.q' + previousQuestionNumber);
    
    // Slide card out to the left (reverse direction)
    Survey.style.transition = 'transform 0.75s ease, opacity 0.75s ease';
    Survey.style.transform = 'translateX(-100%)';
    Survey.style.opacity = '0';
    
    // Wait for slide out animation
    setTimeout(() => {
        // Switch questions
        currentQ.style.display = "none";
        previousQ.style.display = "block";
        
        // Position card off-screen to the right
        Survey.style.transform = 'translateX(100%)';
        
        // Trigger slide in from right
        setTimeout(() => {
            Survey.style.transform = 'translateX(0)';
            Survey.style.opacity = '1';
        }, 50);
    }, 750);
}

// Transition to end screen
function transitionToEnd() {
    // Slide card out to the right
    Survey.classList.add('slide-out-right');
    
    setTimeout(() => {
        Survey.style.display = "none";
        end.style.display = "block";
        
        setTimeout(() => {
            end.classList.add('show');
        }, 50);
    }, 750);
}

option1.addEventListener("change", (e) => {
    if (e.target.type === 'radio') {
        answers.q1 = e.target.value;
        transitionQuestion(q1, q2);
    }
});

option2.addEventListener("change", (e) => {
    if (e.target.type === 'radio') {
        answers.q2 = e.target.value;
        transitionQuestion(q2, q3);
    }
});

option3.addEventListener("change", (e) => {
    if (e.target.type === 'radio') {
        answers.q3 = e.target.value;
        transitionQuestion(q3, q4);
    }
});

option4.addEventListener("change", (e) => {
    if (e.target.type === 'radio') {
        answers.q4 = e.target.value;
        transitionQuestion(q4, q5);
    }
});

option5.addEventListener("change", (e) => {
    if (e.target.type === 'radio') {
        answers.q5 = e.target.value;
        // Show submit button
        const submitBtn = document.getElementById('submit-button');
        if (submitBtn) {
            submitBtn.style.display = 'block';
        }
    }
});

function displayResults() {
    const resultsContainer = document.getElementById('results');
    let resultsHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        const questionKey = `q${i}`;
        resultsHTML += `
            <div class="result-item">
                <div class="result-question">Q${i}. ${questions[questionKey]}</div>
                <div class="result-answer">Answer: <strong>${answers[questionKey]}</strong></div>
            </div>
        `;
    }
    
    resultsContainer.innerHTML = resultsHTML;
}
