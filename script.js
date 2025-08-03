// Test Application - Optimized and Secure Version
class TestApp {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.currentTest = null;
        this.currentStudent = null;
        this.testQuestions = [];
        this.currentQuestionIndex = 0;
        this.studentAnswers = {};
        this.init();
    }

    // Initialize application
    init() {
        this.checkUserRole();
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Auto-save for text inputs
        document.addEventListener('input', (e) => {
            if (e.target.id === 'currentAnswer') {
                this.saveCurrentAnswer();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && !document.getElementById('prevBtn').classList.contains('hidden')) {
                this.previousQuestion();
            } else if (e.key === 'ArrowRight' && !document.getElementById('nextBtn').classList.contains('hidden')) {
                this.nextQuestion();
            }
        });
    }

    // Check user role from URL parameters
    checkUserRole() {
        const params = new URLSearchParams(window.location.search);
        const userId = params.get('user_id');
        const isAdminParam = params.get('admin');

        if (isAdminParam === 'true') {
            this.isAdmin = true;
            this.showAdminInterface();
        } else {
            this.showStudentInterface();
        }
    }

    // Show admin interface
    showAdminInterface() {
        document.getElementById('adminPanel').classList.remove('hidden');
        document.getElementById('studentLogin').classList.add('hidden');
        document.getElementById('testInterface').classList.add('hidden');

        document.getElementById('pageTitle').textContent = '📊 Test Tizimi - Admin Panel';
        document.getElementById('userInfo').textContent = 'Admin Panel';
        document.getElementById('pageDescription').textContent = 'Testlar va natijalar boshqaruvi';

        this.loadDashboard();
    }

    // Show student interface
    showStudentInterface() {
        document.getElementById('adminPanel').classList.add('hidden');
        document.getElementById('studentLogin').classList.remove('hidden');
        document.getElementById('testInterface').classList.add('hidden');

        document.getElementById('pageTitle').textContent = '🎓 Test Tizimi';
        document.getElementById('userInfo').textContent = 'Talaba Paneli';
        document.getElementById('pageDescription').textContent = 'Test topshirish uchun ma\'lumotlaringizni kiriting';
    }

    // Start test (for students)
    async startTest(event) {
        event.preventDefault();

        const testCode = document.getElementById('testCode').value.trim().toUpperCase();
        const studentName = document.getElementById('studentName').value.trim();

        if (!testCode) {
            this.showMessage('❌ Test kodini kiriting!', 'error');
            return;
        }

        if (!studentName || studentName.length < 3) {
            this.showMessage('❌ Ism familiyangizni to\'liq kiriting!', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Simulate test validation (replace with actual API call)
            const test = await this.validateTest(testCode);

            if (!test) {
                this.showMessage('❌ Bunday test kodi mavjud emas!', 'error');
                return;
            }

            this.currentTest = test;

            // Create student record
            this.currentStudent = {
                id: Date.now(),
                name: studentName,
                testCode: testCode,
                startedAt: new Date()
            };

            // Load test questions
            await this.loadTestQuestions();

            // Show test interface
            this.showTestInterface();

        } catch (error) {
            console.error('Test boshlashda xatolik:', error);
            this.showMessage('❌ Testni boshlashda xatolik yuz berdi!', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Validate test (mock function)
    async validateTest(testCode) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock test data
        const mockTests = {
            'TEST001': {
                id: 1,
                code: 'TEST001',
                title: 'Matematika Testi',
                openQuestions: 3,
                closedQuestions: 7,
                isActive: true
            },
            'TEST002': {
                id: 2,
                code: 'TEST002',
                title: 'Fizika Testi',
                openQuestions: 2,
                closedQuestions: 8,
                isActive: true
            }
        };

        return mockTests[testCode] || null;
    }

    // Load test questions
    async loadTestQuestions() {
        // Mock questions data
        this.testQuestions = [];

        // Generate mock questions
        for (let i = 1; i <= this.currentTest.openQuestions; i++) {
            this.testQuestions.push({
                id: i,
                number: i,
                type: 'open',
                text: `Bu ${i}-ochiq savol. Javobingizni yozing.`,
                correctAnswer: ''
            });
        }

        for (let i = 1; i <= this.currentTest.closedQuestions; i++) {
            this.testQuestions.push({
                id: this.currentTest.openQuestions + i,
                number: this.currentTest.openQuestions + i,
                type: 'closed',
                text: `Bu ${this.currentTest.openQuestions + i}-yopiq savol. To'g'ri javobni tanlang.`,
                options: ['Variant A', 'Variant B', 'Variant C', 'Variant D'],
                correctAnswer: 'A'
            });
        }

        this.currentQuestionIndex = 0;
        this.studentAnswers = {};
    }

    // Show test interface
    showTestInterface() {
        document.getElementById('studentLogin').classList.add('hidden');
        document.getElementById('testInterface').classList.remove('hidden');
        document.getElementById('adminPanel').classList.add('hidden');

        document.getElementById('testTitle').textContent = `📝 ${this.currentTest.title}`;
        document.getElementById('totalQuestions').textContent = this.testQuestions.length;

        this.showCurrentQuestion();
    }

    // Show current question
    showCurrentQuestion() {
        if (this.currentQuestionIndex >= this.testQuestions.length) {
            this.finishTest();
            return;
        }

        const question = this.testQuestions[this.currentQuestionIndex];
        const questionContainer = document.getElementById('questionContainer');

        // Update progress
        document.getElementById('currentQuestion').textContent = this.currentQuestionIndex + 1;
        const progressPercent = ((this.currentQuestionIndex + 1) / this.testQuestions.length) * 100;
        document.getElementById('progressFill').style.width = progressPercent + '%';

        // Show question
        let questionHtml = `
            <div class="question-title">
                ${question.type === 'open' ? '📖 Ochiq' : '📋 Yopiq'} Savol ${this.currentQuestionIndex + 1}
            </div>
            <div class="question-text">
                ${question.text}
            </div>
        `;

        if (question.type === 'open') {
            questionHtml += `
                <textarea
                    id="currentAnswer"
                    class="answer-input"
                    placeholder="Javobingizni bu yerga yozing..."
                >${this.studentAnswers[this.currentQuestionIndex] || ''}</textarea>
            `;
        } else {
            questionHtml += `
                <div class="answer-options">
                    ${question.options.map((option, index) => {
                        const letter = String.fromCharCode(65 + index);
                        const isSelected = this.studentAnswers[this.currentQuestionIndex] === letter;
                        return `
                            <div class="answer-option ${isSelected ? 'selected' : ''}"
                                 onclick="testApp.selectClosedAnswer('${letter}')">
                                <input type="radio" name="answer" value="${letter}" ${isSelected ? 'checked' : ''}>
                                <span>${letter}) ${option}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        questionContainer.innerHTML = questionHtml;

        // Update navigation buttons
        document.getElementById('prevBtn').classList.toggle('hidden', this.currentQuestionIndex === 0);
        document.getElementById('nextBtn').classList.toggle('hidden', this.currentQuestionIndex === this.testQuestions.length - 1);
        document.getElementById('finishBtn').classList.toggle('hidden', this.currentQuestionIndex !== this.testQuestions.length - 1);
    }

    // Save current answer (for open questions)
    saveCurrentAnswer() {
        const answerElement = document.getElementById('currentAnswer');
        if (answerElement) {
            this.studentAnswers[this.currentQuestionIndex] = answerElement.value.trim();
        }
    }

    // Select closed answer
    selectClosedAnswer(option) {
        this.studentAnswers[this.currentQuestionIndex] = option;

        // Update UI
        document.querySelectorAll('.answer-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        const selectedOption = document.querySelector(`[onclick="testApp.selectClosedAnswer('${option}')"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }

        const radioButton = document.querySelector(`input[value="${option}"]`);
        if (radioButton) {
            radioButton.checked = true;
        }
    }

    // Next question
    nextQuestion() {
        if (this.currentQuestionIndex < this.testQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.showCurrentQuestion();
        }
    }

    // Previous question
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showCurrentQuestion();
        }
    }

    // Finish test
    async finishTest() {
        if (!confirm('Testni yakunlashni tasdiqlaysizmi? Bu amal qaytarib bo\'lmaydi!')) {
            return;
        }

        this.showLoading(true);

        try {
            // Calculate results
            let correctAnswers = 0;
            const totalQuestions = this.testQuestions.length;

            this.testQuestions.forEach((question, index) => {
                const studentAnswer = this.studentAnswers[index] || '';
                if (studentAnswer.toLowerCase() === question.correctAnswer.toLowerCase()) {
                    correctAnswers++;
                }
            });

            const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

            // Show results
            this.showTestResults(correctAnswers, totalQuestions, percentage);

        } catch (error) {
            console.error('Testni yakunlashda xatolik:', error);
            this.showMessage('❌ Testni yakunlashda xatolik yuz berdi!', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Show test results
    showTestResults(correct, total, percentage) {
        const scoreClass = percentage >= 80 ? 'score-high' :
                          percentage >= 60 ? 'score-medium' : 'score-low';

        document.getElementById('questionContainer').innerHTML = `
            <div class="result-summary">
                <h2>🎉 Test Yakunlandi!</h2>
                <div class="result-score">${correct}/${total}</div>
                <div class="result-percentage ${scoreClass}">${percentage}%</div>

                <div class="result-details">
                    <div class="result-detail">
                        <h4>✅ To'g'ri Javoblar</h4>
                        <div style="font-size: 1.5em; font-weight: bold;">${correct}</div>
                    </div>
                    <div class="result-detail">
                        <h4>❌ Noto'g'ri Javoblar</h4>
                        <div style="font-size: 1.5em; font-weight: bold;">${total - correct}</div>
                    </div>
                    <div class="result-detail">
                        <h4>📊 Umumiy Ball</h4>
                        <div style="font-size: 1.5em; font-weight: bold;">${percentage}%</div>
                    </div>
                    <div class="result-detail">
                        <h4>📝 Test</h4>
                        <div style="font-size: 1.1em;">${this.currentTest.title}</div>
                    </div>
                </div>

                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 2rem;">
                    🔄 Yangi Test Topshirish
                </button>
            </div>
        `;

        // Hide navigation buttons
        document.getElementById('prevBtn').classList.add('hidden');
        document.getElementById('nextBtn').classList.add('hidden');
        document.getElementById('finishBtn').classList.add('hidden');
    }

    // Tab switching
    showTab(tabName) {
        // Hide all tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab panel
        document.getElementById(tabName).classList.remove('hidden');

        // Add active class to clicked tab
        event.target.classList.add('active');
    }

    // Load dashboard
    loadDashboard() {
        // Mock statistics
        const stats = [
            { number: '12', label: '👥 Foydalanuvchilar' },
            { number: '8', label: '📝 Jami Testlar' },
            { number: '3', label: '✅ Faol Testlar' },
            { number: '45', label: '🎓 Test Topshirganlar' }
        ];

        const statsHtml = stats.map(stat => `
            <div class="stat-card">
                <div class="stat-number">${stat.number}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');

        document.getElementById('statsGrid').innerHTML = statsHtml;
    }

    // Create test (admin)
    async createTest(event) {
        event.preventDefault();

        const testCode = document.getElementById('newTestCode').value.trim().toUpperCase();
        const testTitle = document.getElementById('newTestTitle').value.trim();
        const openCount = parseInt(document.getElementById('openCount').value) || 0;
        const closedCount = parseInt(document.getElementById('closedCount').value) || 0;

        if (!testCode || !testTitle) {
            this.showMessage('❌ Barcha maydonlarni to\'ldiring!', 'error');
            return;
        }

        if (openCount + closedCount === 0) {
            this.showMessage('❌ Kamida bitta savol qo\'shing!', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Simulate test creation
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.showMessage('✅ Test muvaffaqiyatli yaratildi!', 'success');

            // Reset form
            event.target.reset();

            // Show answers section
            this.showAnswersSection(testCode, openCount, closedCount);

        } catch (error) {
            console.error('Test yaratishda xatolik:', error);
            this.showMessage('❌ Test yaratishda xatolik yuz berdi!', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Show answers section
    showAnswersSection(testCode, openCount, closedCount) {
        const answersSection = document.getElementById('answersSection');
        const answersContent = document.getElementById('answersContent');

        let html = `<p>Test kodi: <strong>${testCode}</strong></p>`;

        if (openCount > 0) {
            html += `<h4>📖 Ochiq Savollar (${openCount} ta)</h4>`;
            for (let i = 1; i <= openCount; i++) {
                html += `
                    <div class="form-group">
                        <label>Savol ${i}:</label>
                        <textarea placeholder="Ochiq savol matnini kiriting..." rows="3"></textarea>
                    </div>
                `;
            }
        }

        if (closedCount > 0) {
            html += `<h4>📋 Yopiq Savollar (${closedCount} ta)</h4>`;
            for (let i = 1; i <= closedCount; i++) {
                html += `
                    <div class="form-group">
                        <label>Savol ${i}:</label>
                        <textarea placeholder="Yopiq savol matnini kiriting..." rows="2"></textarea>
                        <div class="form-row">
                            <input type="text" placeholder="A) variant">
                            <input type="text" placeholder="B) variant">
                        </div>
                        <div class="form-row">
                            <input type="text" placeholder="C) variant">
                            <input type="text" placeholder="D) variant">
                        </div>
                        <select>
                            <option value="">To'g'ri javobni tanlang</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                        </select>
                    </div>
                `;
            }
        }

        html += `<button onclick="testApp.saveAnswers()" class="btn btn-success">💾 Javoblarni Saqlash</button>`;

        answersContent.innerHTML = html;
        answersSection.classList.remove('hidden');
    }

    // Save answers
    saveAnswers() {
        this.showMessage('✅ Javoblar muvaffaqiyatli saqlandi!', 'success');
        document.getElementById('answersSection').classList.add('hidden');
    }

    // Load tests
    loadTests() {
        const content = document.getElementById('managementContent');
        content.innerHTML = `
            <h3>📝 Testlar Ro'yxati</h3>
            <div class="test-item">
                <div>
                    <strong>TEST001</strong> - Matematika Testi
                    <div style="font-size: 0.9em; color: #666;">10 savol • Faol</div>
                </div>
                <div>
                    <button class="btn btn-secondary" style="padding: 0.5rem 1rem; margin: 0.2rem;">✏️ Tahrirlash</button>
                    <button class="btn btn-danger" style="padding: 0.5rem 1rem; margin: 0.2rem;">🗑️ O'chirish</button>
                </div>
            </div>
            <div class="test-item">
                <div>
                    <strong>TEST002</strong> - Fizika Testi
                    <div style="font-size: 0.9em; color: #666;">10 savol • Faol</div>
                </div>
                <div>
                    <button class="btn btn-secondary" style="padding: 0.5rem 1rem; margin: 0.2rem;">✏️ Tahrirlash</button>
                    <button class="btn btn-danger" style="padding: 0.5rem 1rem; margin: 0.2rem;">🗑️ O'chirish</button>
                </div>
            </div>
        `;
    }

    // Load students
    loadStudents() {
        const content = document.getElementById('managementContent');
        content.innerHTML = `
            <h3>🎓 O'quvchilar Ro'yxati</h3>
            <div class="student-item">
                <div>
                    <strong>Ahmadjon Karimov</strong>
                    <div style="font-size: 0.9em; color: #666;">TEST001 • 85% • 2024-01-15</div>
                </div>
                <div class="score score-high">85%</div>
            </div>
            <div class="student-item">
                <div>
                    <strong>Malika Toshmatova</strong>
                    <div style="font-size: 0.9em; color: #666;">TEST002 • 72% • 2024-01-15</div>
                </div>
                <div class="score score-medium">72%</div>
            </div>
        `;
    }

    // Export results
    exportResults() {
        this.showMessage('📊 Natijalar eksport qilindi!', 'success');
    }

    // Show loading overlay
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    // Show message
    showMessage(text, type = 'info') {
        const container = document.getElementById('messageContainer');
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;

        container.appendChild(message);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);
    }
}

// Global functions for HTML onclick events
let testApp;

function startTest(event) {
    testApp.startTest(event);
}

function nextQuestion() {
    testApp.nextQuestion();
}

function previousQuestion() {
    testApp.previousQuestion();
}

function finishTest() {
    testApp.finishTest();
}

function showTab(tabName) {
    testApp.showTab(tabName);
}

function createTest(event) {
    testApp.createTest(event);
}

function loadTests() {
    testApp.loadTests();
}

function loadStudents() {
    testApp.loadStudents();
}

function exportResults() {
    testApp.exportResults();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    testApp = new TestApp();
});

// Add some CSS for test and student items
const additionalCSS = `
.test-item, .student-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 1px solid #e1e5e9;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    background: #f8f9fa;
}

.test-item > div:first-child,
.student-item > div:first-child {
    flex: 1;
}

.test-item > div:last-child,
.student-item > div:last-child {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

@media (max-width: 768px) {
    .test-item, .student-item {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
    }

    .test-item > div:last-child,
    .student-item > div:last-child {
        width: 100%;
        justify-content: center;
    }
}
`;

// Add additional CSS to head
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

