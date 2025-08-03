// Supabase konfiguratsiyasi
const SUPABASE_URL = 'https://jwkgrkvornagxauwrduq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3a2dya3Zvcm5hZ3hhdXdyZHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwOTM4NDcsImV4cCI6MjA2OTY2OTg0N30.LOF8n-jJKzm9DcTTWu4QYrqWf7x7zLd3m29BlP8-n1I';

// Supabase client yaratish
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let isAdmin = false;
let currentTest = null;
let currentStudent = null;
let testQuestions = [];
let currentQuestionIndex = 0;
let studentAnswers = {};

// URL parametrlaridan user_id olish
function getUserIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('user_id') || null;
}

// Foydalanuvchi rolini aniqlash
async function checkUserRole() {
    const userId = getUserIdFromUrl();

    if (!userId) {
        // Student interface ko'rsatish
        showStudentInterface();
        return;
    }

    try {
        // Users jadvalidan foydalanuvchini qidirish
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        if (error || !user) {
            showStudentInterface();
            return;
        }

        currentUser = user;
        isAdmin = user.is_admin;

        if (isAdmin) {
            showAdminInterface();
        } else {
            showStudentInterface();
        }

    } catch (error) {
        console.error('Foydalanuvchi rolini aniqlashda xatolik:', error);
        showStudentInterface();
    }
}

// Admin interfeysi ko'rsatish
function showAdminInterface() {
    document.getElementById('adminTabs').style.display = 'block';
    document.getElementById('adminContent').style.display = 'block';
    document.getElementById('studentLogin').style.display = 'none';
    document.getElementById('testInterface').style.display = 'none';

    document.getElementById('pageTitle').textContent = '📊 Test Tizimi - Admin Panel';
    document.getElementById('userInfo').textContent = `Admin: ${currentUser.full_name || currentUser.first_name}`;
    document.getElementById('pageDescription').textContent = 'Barcha testlar va natijalar statistikasi';

    loadAllData();
}

// Student interfeysi ko'rsatish
function showStudentInterface() {
    document.getElementById('adminTabs').style.display = 'none';
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('studentLogin').style.display = 'block';
    document.getElementById('testInterface').style.display = 'none';

    document.getElementById('pageTitle').textContent = '🎓 Test Tizimi';
    document.getElementById('userInfo').textContent = currentUser ?
        `Foydalanuvchi: ${currentUser.full_name || currentUser.first_name}` :
        'Mehmon';
    document.getElementById('pageDescription').textContent = 'Test topshirish uchun ma\'lumotlaringizni kiriting';
}

// Test boshlash (studentlar uchun)
async function startTest() {
    const testCode = document.getElementById('testCodeInput').value.trim().toUpperCase();
    const studentName = document.getElementById('studentName').value.trim();

    if (!testCode) {
        alert('❌ Test kodini kiriting!');
        return;
    }

    if (!studentName || studentName.length < 3) {
        alert('❌ Ism familiyangizni to\'liq kiriting!');
        return;
    }

    try {
        // Testni tekshirish
        const { data: test, error: testError } = await supabase
            .from('tests')
            .select('*')
            .eq('code', testCode)
            .eq('is_active', true)
            .single();

        if (testError || !test) {
            alert('❌ Bunday test kodi mavjud emas yoki test faol emas!');
            return;
        }

        currentTest = test;

        // Studentni ro'yxatga olish
        const { data: student, error: studentError } = await supabase
            .from('students')
            .insert([{
                telegram_id: currentUser?.telegram_id || null,
                full_name: studentName,
                test_code: testCode,
                total_questions: test.open_questions_count + test.closed_questions_count,
                started_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (studentError) {
            console.error('Student yaratishda xatolik:', studentError);
            alert('❌ Testga yozilishda xatolik yuz berdi!');
            return;
        }

        currentStudent = student;

        // Test javoblarini yuklash
        await loadTestQuestions();

        // Test interfeysi ko'rsatish
        showTestInterface();

    } catch (error) {
        console.error('Test boshlashda xatolik:', error);
        alert('❌ Testni boshlashda xatolik yuz berdi!');
    }
}

// Test savollarini yuklash
async function loadTestQuestions() {
    try {
        const { data: answers, error } = await supabase
            .from('test_answers')
            .select('*')
            .eq('test_id', currentTest.id)
            .order('question_number');

        if (error) throw error;

        testQuestions = answers || [];
        currentQuestionIndex = 0;
        studentAnswers = {};

    } catch (error) {
        console.error('Test savollarini yuklashda xatolik:', error);
        alert('❌ Test savollarini yuklashda xatolik yuz berdi!');
    }
}

// Test interfeysi ko'rsatish
function showTestInterface() {
    document.getElementById('studentLogin').style.display = 'none';
    document.getElementById('testInterface').style.display = 'block';
    document.getElementById('adminTabs').style.display = 'none';
    document.getElementById('adminContent').style.display = 'none';

    document.getElementById('testTitle').textContent = `📝 ${currentTest.title}`;
    document.getElementById('totalQuestions').textContent = testQuestions.length;

    showCurrentQuestion();
}

// Hozirgi savolni ko'rsatish
function showCurrentQuestion() {
    if (currentQuestionIndex >= testQuestions.length) {
        finishTest();
        return;
    }

    const question = testQuestions[currentQuestionIndex];
    const questionContainer = document.getElementById('questionContainer');

    // Progress yangilash
    document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;
    const progressPercent = ((currentQuestionIndex + 1) / testQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progressPercent + '%';

    // Savol ko'rsatish
    let questionHtml = `
        <div class="question-title">
            ${question.question_type === 'open' ? '📖 Ochiq' : '📋 Yopiq'} Savol ${currentQuestionIndex + 1}
        </div>
        <div class="question-text">
            Savolga javob bering:
        </div>
    `;

    if (question.question_type === 'open') {
        questionHtml += `
            <textarea
                id="currentAnswer"
                class="answer-input"
                placeholder="Javobingizni bu yerga yozing..."
                onchange="saveCurrentAnswer()"
            >${studentAnswers[currentQuestionIndex] || ''}</textarea>
        `;
    } else {
        questionHtml += `
            <div class="answer-options">
                <div class="answer-option ${studentAnswers[currentQuestionIndex] === 'A' ? 'selected' : ''}"
                     onclick="selectClosedAnswer('A')">
                    <input type="radio" name="answer" value="A" ${studentAnswers[currentQuestionIndex] === 'A' ? 'checked' : ''}>
                    <span>A) Variant A</span>
                </div>
                <div class="answer-option ${studentAnswers[currentQuestionIndex] === 'B' ? 'selected' : ''}"
                     onclick="selectClosedAnswer('B')">
                    <input type="radio" name="answer" value="B" ${studentAnswers[currentQuestionIndex] === 'B' ? 'checked' : ''}>
                    <span>B) Variant B</span>
                </div>
                <div class="answer-option ${studentAnswers[currentQuestionIndex] === 'C' ? 'selected' : ''}"
                     onclick="selectClosedAnswer('C')">
                    <input type="radio" name="answer" value="C" ${studentAnswers[currentQuestionIndex] === 'C' ? 'checked' : ''}>
                    <span>C) Variant C</span>
                </div>
                <div class="answer-option ${studentAnswers[currentQuestionIndex] === 'D' ? 'selected' : ''}"
                     onclick="selectClosedAnswer('D')">
                    <input type="radio" name="answer" value="D" ${studentAnswers[currentQuestionIndex] === 'D' ? 'checked' : ''}>
                    <span>D) Variant D</span>
                </div>
            </div>
        `;
    }

    questionContainer.innerHTML = questionHtml;

    // Navigation tugmalar
    document.getElementById('prevBtn').style.display = currentQuestionIndex > 0 ? 'block' : 'none';
    document.getElementById('nextBtn').style.display = currentQuestionIndex < testQuestions.length - 1 ? 'block' : 'none';
    document.getElementById('finishBtn').style.display = currentQuestionIndex === testQuestions.length - 1 ? 'block' : 'none';
}

// Hozirgi javobni saqlash (ochiq savollar uchun)
function saveCurrentAnswer() {
    const answer = document.getElementById('currentAnswer').value.trim();
    studentAnswers[currentQuestionIndex] = answer;
}

// Yopiq javobni tanlash
function selectClosedAnswer(option) {
    studentAnswers[currentQuestionIndex] = option;

    // Barcha optionlardan selected classni olib tashlash
    document.querySelectorAll('.answer-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    // Tanlangan optionga selected class qo'shish
    event.currentTarget.classList.add('selected');

    // Radio buttonni belgilash
    document.querySelector(`input[value="${option}"]`).checked = true;
}

// Keyingi savolga o'tish
function nextQuestion() {
    if (currentQuestionIndex < testQuestions.length - 1) {
        currentQuestionIndex++;
        showCurrentQuestion();
    }
}

// Oldingi savolga qaytish
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showCurrentQuestion();
    }
}

// Testni yakunlash
async function finishTest() {
    if (!confirm('Testni yakunlashni tasdiqlaysizmi? Bu amal qaytarib bo\'lmaydi!')) {
        return;
    }

    try {
        // Javoblarni bazaga saqlash
        const answersToSave = [];
        for (let i = 0; i < testQuestions.length; i++) {
            if (studentAnswers[i]) {
                answersToSave.push({
                    student_id: currentStudent.id,
                    question_number: testQuestions[i].question_number,
                    question_type: testQuestions[i].question_type,
                    student_answer: studentAnswers[i],
                    is_correct: studentAnswers[i] === testQuestions[i].correct_answer
                });
            }
        }

        if (answersToSave.length > 0) {
            const { error: saveError } = await supabase
                .from('student_answers')
                .insert(answersToSave);

            if (saveError) throw saveError;
        }

        // Natijalarni hisoblash
        const correctAnswers = answersToSave.filter(answer => answer.is_correct).length;
        const totalQuestions = testQuestions.length;
        const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

        // Studentni yangilash
        const { error: updateError } = await supabase
            .from('students')
            .update({
                score: correctAnswers,
                percentage: percentage,
                completed_at: new Date().toISOString()
            })
            .eq('id', currentStudent.id);

        if (updateError) throw updateError;

        // Natijalar sahifasini ko'rsatish
        showTestResults(correctAnswers, totalQuestions, percentage);

    } catch (error) {
        console.error('Testni yakunlashda xatolik:', error);
        alert('❌ Testni yakunlashda xatolik yuz berdi!');
    }
}

// Test natijalarini ko'rsatish
function showTestResults(correct, total, percentage) {
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
                    <div style="font-size: 1.1em;">${currentTest.title}</div>
                </div>
            </div>

            <button onclick="location.reload()" class="btn" style="margin-top: 30px; max-width: 300px;">
                🔄 Yangi Test Topshirish
            </button>
        </div>
    `;

    // Navigation tugmalarni yashirish
    document.getElementById('prevBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('finishBtn').style.display = 'none';
}

// Tab almashtirish
function showTab(tabName) {
    // Barcha tab-contentlarni yashirish
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Barcha tablardan active classni olib tashlash
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Kerakli tabni ko'rsatish
    document.getElementById(tabName).style.display = 'block';
    event.target.classList.add('active');
}

// Dashboard statistikasini yuklash
async function loadDashboard() {
    if (!isAdmin) return;

    try {
        document.getElementById('statsGrid').innerHTML = '<div class="loading">📊 Statistika yuklanmoqda...</div>';

        const [usersResult, testsResult, studentsResult] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact' }),
            supabase.from('tests').select('id', { count: 'exact' }),
            supabase.from('students').select('id', { count: 'exact' })
        ]);

        const usersCount = usersResult.count || 0;
        const testsCount = testsResult.count || 0;
        const studentsCount = studentsResult.count || 0;

        // Faol testlar sonini hisoblash
        const { count: activeTestsCount } = await supabase
            .from('tests')
            .select('id', { count: 'exact' })
            .eq('is_active', true);

        const html = `
            <div class="stat-card">
                <div class="stat-number">${usersCount}</div>
                <div class="stat-label">👥 Foydalanuvchilar</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${testsCount}</div>
                <div class="stat-label">📝 Jami Testlar</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${activeTestsCount || 0}</div>
                <div class="stat-label">✅ Faol Testlar</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${studentsCount}</div>
                <div class="stat-label">🎓 O'quvchilar</div>
            </div>
        `;

        document.getElementById('statsGrid').innerHTML = html;

    } catch (error) {
        console.error('Dashboard yuklanmadi:', error);
        document.getElementById('statsGrid').innerHTML = '<div class="error">❌ Statistika yuklanmadi: ' + error.message + '</div>';
    }
}

// Test yaratish funksiyasi
async function createTest() {
    if (!isAdmin) {
        alert('❌ Sizda test yaratish huquqi yo\'q!');
        return;
    }

    const code = document.getElementById('testCode').value.trim().toUpperCase();
    const title = document.getElementById('testTitle').value.trim();
    const openCount = parseInt(document.getElementById('openCount').value);
    const closedCount = parseInt(document.getElementById('closedCount').value);

    // Validatsiya
    if (!code || code.length < 3) {
        alert('❌ Test kodi kamida 3 ta belgidan iborat bo\'lishi kerak!');
        return;
    }

    if (!title || title.length < 3) {
        alert('❌ Test nomi kamida 3 ta belgidan iborat bo\'lishi kerak!');
        return;
    }

    if (openCount + closedCount === 0) {
        alert('❌ Kamida bitta savol bo\'lishi kerak!');
        return;
    }

    if (openCount > 50 || closedCount > 50) {
        alert('❌ Har bir tur uchun maksimal 50 ta savol!');
        return;
    }

    try {
        // Kod mavjudligini tekshirish
        const { data: existingTest } = await supabase
            .from('tests')
            .select('*')
            .eq('code', code)
            .single();

        if (existingTest) {
            alert('❌ Bu kod allaqachon mavjud! Boshqa kod tanlang.');
            return;
        }
    } catch (error) {
        // Test topilmadi - davom etish mumkin
    }

    try {
        // Testni yaratish
        const { data: testData, error: testError } = await supabase
            .from('tests')
            .insert([{
                code: code,
                title: title,
                admin_id: currentUser.telegram_id,
                open_questions_count: openCount,
                closed_questions_count: closedCount,
                is_active: false  // Javoblar kiritilgunga qadar nofaol
            }])
            .select()
            .single();

        if (testError) throw testError;

        // Muvaffaqiyat xabari
        document.getElementById('createTestForm').innerHTML = `
            <div class="success-message">
                <h3>✅ Test muvaffaqiyatli yaratildi!</h3>
                <p><strong>Kod:</strong> ${code}</p>
                <p><strong>Nom:</strong> ${title}</p>
                <p><strong>Ochiq savollar:</strong> ${openCount}</p>
                <p><strong>Yopiq savollar:</strong> ${closedCount}</p>
                <p><em>Endi javoblarni kiritib, testni faollashtiring.</em></p>
            </div>
            <button onclick="location.reload()" class="btn">🔄 Yangi Test Yaratish</button>
        `;

        // Javoblar kiritish qismini ko'rsatish
        if (openCount > 0 || closedCount > 0) {
            showAnswersSection(testData.id, openCount, closedCount);
        }

    } catch (error) {
        console.error('Test yaratishda xatolik:', error);
        alert('❌ Test yaratishda xatolik yuz berdi: ' + error.message);
    }
}

// Javoblar kiritish qismini ko'rsatish
function showAnswersSection(testId, openCount, closedCount) {
    const answersSection = document.getElementById('answersSection');
    answersSection.style.display = 'block';

    let html = '<div id="answersProgress"></div>';

    // Ochiq savollar uchun
    if (openCount > 0) {
        html += '<h4>📖 Ochiq Savollar Javoblari</h4>';
        for (let i = 1; i <= openCount; i++) {
            html += `
                <div class="question-input" id="open-${i}">
                    <label class="form-label">${i}-savol to'g'ri javobi:</label>
                    <input type="text" id="openAnswer${i}" class="form-input"
                           placeholder="To'g'ri javobni kiriting" />
                    <button onclick="saveAnswer(${testId}, ${i}, 'open')" class="btn" style="margin-top: 10px;">
                        💾 Saqlash
                    </button>
                </div>
            `;
        }
    }

    // Yopiq savollar uchun
    if (closedCount > 0) {
        html += '<h4>📋 Yopiq Savollar Javoblari</h4>';
        for (let i = 1; i <= closedCount; i++) {
            html += `
                <div class="question-input" id="closed-${i}">
                    <label class="form-label">${i}-savol to'g'ri javobi:</label>
                    <select id="closedAnswer${i}" class="form-input">
                        <option value="">Javobni tanlang</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                    </select>
                    <button onclick="saveAnswer(${testId}, ${i}, 'closed')" class="btn" style="margin-top: 10px;">
                        💾 Saqlash
                    </button>
                </div>
            `;
        }
    }

    html += `
        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h4>📊 Yakunlash</h4>
            <p>Barcha javoblarni kiritgandan keyin testni faollashtiring:</p>
            <button onclick="finishTestCreation(${testId})" class="btn btn-success">
                ✅ Testni Faollashtirish
            </button>
        </div>
    `;

    document.getElementById('answersContent').innerHTML = html;
    updateProgress(testId);
}

// Javobni saqlash
async function saveAnswer(testId, questionNumber, questionType) {
    const inputId = questionType === 'open' ? `openAnswer${questionNumber}` : `closedAnswer${questionNumber}`;
    const answer = document.getElementById(inputId).value.trim();

    if (!answer) {
        alert('❌ Javobni kiriting!');
        return;
    }

    if (questionType === 'closed' && !['A', 'B', 'C', 'D'].includes(answer)) {
        alert('❌ Faqat A, B, C yoki D ni tanlang!');
        return;
    }

    try {
        const { error } = await supabase
            .from('test_answers')
            .upsert([{
                test_id: testId,
                question_number: questionNumber,
                question_type: questionType,
                correct_answer: answer
            }]);

        if (error) throw error;

        // Muvaffaqiyat belgisi
        const container = document.getElementById(`${questionType}-${questionNumber}`);
        container.classList.add('completed');
        container.style.background = '#d4edda';
        container.style.borderColor = '#28a745';

        const button = container.querySelector('button');
        button.innerHTML = '✅ Saqlandi';
        button.disabled = true;
        button.style.background = '#28a745';

        // Progressni yangilash
        await updateProgress(testId);

    } catch (error) {
        console.error('Javobni saqlashda xatolik:', error);
        alert('❌ Javobni saqlashda xatolik: ' + error.message);
    }
}

// Progress yangilash
async function updateProgress(testId) {
    try {
        const { data: savedAnswers } = await supabase
            .from('test_answers')
            .select('*')
            .eq('test_id', testId);

        const { data: test } = await supabase
            .from('tests')
            .select('open_questions_count, closed_questions_count')
            .eq('id', testId)
            .single();

        if (!test) return;

        const totalAnswers = test.open_questions_count + test.closed_questions_count;
        const savedCount = savedAnswers ? savedAnswers.length : 0;
        const percentage = totalAnswers > 0 ? (savedCount / totalAnswers) * 100 : 0;

        document.getElementById('answersProgress').innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4>📊 Javoblar Kiritish Jarayoni</h4>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <p>${savedCount}/${totalAnswers} javob kiritildi (${Math.round(percentage)}%)</p>
            </div>
        `;

    } catch (error) {
        console.error('Progress yangilashda xatolik:', error);
    }
}

// Test yaratishni yakunlash
async function finishTestCreation(testId) {
    try {
        const { data: test } = await supabase
            .from('tests')
            .select('*')
            .eq('id', testId)
            .single();

        const { data: answers } = await supabase
            .from('test_answers')
            .select('*')
            .eq('test_id', testId);

        if (!test) {
            alert('❌ Test topilmadi!');
            return;
        }

        const expectedAnswers = test.open_questions_count + test.closed_questions_count;
        const actualAnswers = answers ? answers.length : 0;

        if (actualAnswers < expectedAnswers) {
            alert(`❌ Barcha javoblarni kiriting! ${actualAnswers}/${expectedAnswers} kiritildi.`);
            return;
        }

        // Testni faollashtirish
        const { error } = await supabase
            .from('tests')
            .update({ is_active: true })
            .eq('id', testId);

        if (error) throw error;

        alert('🎉 Test muvaffaqiyatli yaratildi va faollashtirildi!');
        location.reload();

    } catch (error) {
        console.error('Test yakunlashda xatolik:', error);
        alert('❌ Xatolik yuz berdi: ' + error.message);
    }
}

// Foydalanuvchilarni yuklash
async function loadUsers() {
    if (!isAdmin) return;

    try {
        document.getElementById('usersList').innerHTML = '<div class="loading">👥 Foydalanuvchilar yuklanmoqda...</div>';

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!users || users.length === 0) {
            document.getElementById('usersList').innerHTML = '<div class="card">📭 Hozircha foydalanuvchilar yo\'q</div>';
            return;
        }

        let html = '';
        users.forEach(user => {
            html += `
                <div class="card">
                    <h3>${user.full_name || (user.first_name + ' ' + (user.last_name || ''))}</h3>
                    <p><strong>Telegram ID:</strong> ${user.telegram_id}</p>
                    <p><strong>Username:</strong> @${user.username || 'Noma\'lum'}</p>
                    <p><strong>Admin:</strong> ${user.is_admin ? '✅ Ha' : '❌ Yo\'q'}</p>
                    <p><strong>Ro'yxatdan o'tgan:</strong> ${new Date(user.created_at).toLocaleDateString('uz-UZ')}</p>
                    <p><strong>Oxirgi faollik:</strong> ${new Date(user.last_active).toLocaleDateString('uz-UZ')}</p>
                </div>
            `;
        });

        document.getElementById('usersList').innerHTML = html;

    } catch (error) {
        console.error('Foydalanuvchilar yuklanmadi:', error);
        document.getElementById('usersList').innerHTML = '<div class="error">❌ Foydalanuvchilar yuklanmadi: ' + error.message + '</div>';
    }
}

// Testlarni yuklash
async function loadTests() {
    if (!isAdmin) return;

    try {
        document.getElementById('testsList').innerHTML = '<div class="loading">📝 Testlar yuklanmoqda...</div>';

        const { data: tests, error } = await supabase
            .from('tests')
            .select(`
                *,
                users!tests_admin_id_fkey(full_name, first_name, last_name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!tests || tests.length === 0) {
            document.getElementById('testsList').innerHTML = '<div class="card">📭 Hozircha testlar yo\'q</div>';
            return;
        }

        let html = '';
        tests.forEach(test => {
            const adminName = test.users?.full_name ||
                           (test.users?.first_name + ' ' + (test.users?.last_name || '')) ||
                           'Noma\'lum';

            html += `
                <div class="test-item">
                    <div>
                        <div class="test-code">${test.code}</div>
                        <div><strong>${test.title}</strong></div>
                        <div>Admin: ${adminName}</div>
                        <div>Ochiq: ${test.open_questions_count}, Yopiq: ${test.closed_questions_count}</div>
                        <div>Yaratilgan: ${new Date(test.created_at).toLocaleDateString('uz-UZ')}</div>
                    </div>
                    <div class="test-status ${test.is_active ? 'status-active' : 'status-inactive'}">
                        ${test.is_active ? 'Faol' : 'Nofaol'}
                    </div>
                </div>
            `;
        });

        document.getElementById('testsList').innerHTML = html;

    } catch (error) {
        console.error('Testlar yuklanmadi:', error);
        document.getElementById('testsList').innerHTML = '<div class="error">❌ Testlar yuklanmadi: ' + error.message + '</div>';
    }
}

// O'quvchilarni yuklash
async function loadStudents() {
    if (!isAdmin) return;

    try {
        document.getElementById('studentsList').innerHTML = '<div class="loading">🎓 O\'quvchilar yuklanmoqda...</div>';

        const { data: students, error } = await supabase
            .from('students')
            .select(`
                *,
                tests(title)
            `)
            .order('started_at', { ascending: false });

        if (error) throw error;

        if (!students || students.length === 0) {
            document.getElementById('studentsList').innerHTML = '<div class="card">📭 Hozircha o\'quvchilar yo\'q</div>';
            return;
        }

        let html = '<div style="margin-bottom: 20px;"><strong>O\'quvchi nomi | Test kodi | Ball | Foiz</strong></div>';
        students.forEach(student => {
            const scoreClass = student.percentage >= 80 ? 'score-high' :
                             student.percentage >= 60 ? 'score-medium' : 'score-low';

            html += `
                <div class="student-item">
                    <div>
                        <strong>${student.full_name}</strong>
                        <div style="font-size: 0.9em; color: #666;">
                            Test: ${student.tests?.title || 'Noma\'lum'}
                        </div>
                    </div>
                    <div>${student.test_code}</div>
                    <div>${student.score || 0}/${student.total_questions}</div>
                    <div class="score ${scoreClass}">${student.percentage || 0}%</div>
                </div>
            `;
        });

        document.getElementById('studentsList').innerHTML = html;

    } catch (error) {
        console.error('O\'quvchilar yuklanmadi:', error);
        document.getElementById('studentsList').innerHTML = '<div class="error">❌ O\'quvchilar yuklanmadi: ' + error.message + '</div>';
    }
}

// Natijalarni yuklash
async function loadResults() {
    if (!isAdmin) return;

    try {
        document.getElementById('resultsList').innerHTML = '<div class="loading">📈 Natijalar yuklanmoqda...</div>';

        const { data: results, error } = await supabase
            .from('students')
            .select(`
                *,
                tests(title, code),
                student_answers(*)
            `)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false });

        if (error) throw error;

        if (!results || results.length === 0) {
            document.getElementById('resultsList').innerHTML = '<div class="card">📭 Hozircha natijalar yo\'q</div>';
            return;
        }

        let html = '';
        results.forEach(result => {
            const scoreClass = result.percentage >= 80 ? 'score-high' :
                             result.percentage >= 60 ? 'score-medium' : 'score-low';

            html += `
                <div class="card">
                    <h3>${result.full_name}</h3>
                    <p><strong>Test:</strong> ${result.tests?.title} (${result.test_code})</p>
                    <p><strong>Ball:</strong> ${result.score}/${result.total_questions}</p>
                    <p><strong>Foiz:</strong> <span class="score ${scoreClass}">${result.percentage}%</span></p>
                    <p><strong>Boshlangan:</strong> ${new Date(result.started_at).toLocaleDateString('uz-UZ')} ${new Date(result.started_at).toLocaleTimeString('uz-UZ')}</p>
                    <p><strong>Tugatilgan:</strong> ${new Date(result.completed_at).toLocaleDateString('uz-UZ')} ${new Date(result.completed_at).toLocaleTimeString('uz-UZ')}</p>
                </div>
            `;
        });

        document.getElementById('resultsList').innerHTML = html;

    } catch (error) {
        console.error('Natijalar yuklanmadi:', error);
        document.getElementById('resultsList').innerHTML = '<div class="error">❌ Natijalar yuklanmadi: ' + error.message + '</div>';
    }
}

// Faol testlarni yuklash
async function loadActiveTests() {
    try {
        const { data: tests, error } = await supabase
            .from('tests')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayTestManagement(tests, 'Faol Testlar');
    } catch (error) {
        console.error('Faol testlarni yuklashda xatolik:', error);
    }
}

// Nofaol testlarni yuklash
async function loadInactiveTests() {
    try {
        const { data: tests, error } = await supabase
            .from('tests')
            .select('*')
            .eq('is_active', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayTestManagement(tests, 'Nofaol Testlar');
    } catch (error) {
        console.error('Nofaol testlarni yuklashda xatolik:', error);
    }
}

// Test boshqaruv ko'rinishini ko'rsatish
function displayTestManagement(tests, title) {
    const container = document.getElementById('testManagement');

    if (!tests || tests.length === 0) {
        container.innerHTML = `<p>📭 ${title} yo'q</p>`;
        return;
    }

    let html = `<h4>${title}</h4>`;

    tests.forEach(test => {
        html += `
            <div class="test-item">
                <div>
                    <div class="test-code">${test.code}</div>
                    <div><strong>${test.title}</strong></div>
                    <div>Ochiq: ${test.open_questions_count}, Yopiq: ${test.closed_questions_count}</div>
                    <div>Yaratilgan: ${new Date(test.created_at).toLocaleDateString('uz-UZ')}</div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                    ${test.is_active ?
                        `<button onclick="toggleTestStatus(${test.id}, false)" class="test-action-btn btn-deactivate">🚫 Nofaol</button>` :
                        `<button onclick="toggleTestStatus(${test.id}, true)" class="test-action-btn btn-activate">✅ Faol</button>`
                    }
                    <button onclick="deleteTest(${test.id})" class="test-action-btn btn-delete">🗑️ O'chirish</button>
                    <button onclick="viewTestDetails(${test.id})" class="test-action-btn" style="background: #17a2b8; color: white;">👁️ Ko'rish</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Test statusini o'zgartirish
async function toggleTestStatus(testId, isActive) {
    try {
        const { error } = await supabase
            .from('tests')
            .update({ is_active: isActive })
            .eq('id', testId);

        if (error) throw error;

        alert(`✅ Test ${isActive ? 'faollashtirildi' : 'nofaol qilindi'}!`);
        loadActiveTests(); // Ro'yxatni yangilash

    } catch (error) {
        console.error('Test statusini o\'zgartirishda xatolik:', error);
        alert('❌ Xatolik yuz berdi!');
    }
}

// Testni o'chirish
async function deleteTest(testId) {
    if (!confirm('Testni o\'chirishni tasdiqlaysizmi? Bu amal qaytarib bo\'lmaydi!')) {
        return;
    }

    try {
        // Avval test bilan bog'liq barcha ma'lumotlarni o'chirish
        await Promise.all([
            supabase.from('test_answers').delete().eq('test_id', testId),
            supabase.from('student_answers').delete().eq('test_id', testId)
        ]);

        // Keyin testning o'zini o'chirish
        const { error } = await supabase
            .from('tests')
            .delete()
            .eq('id', testId);

        if (error) throw error;

        alert('✅ Test o\'chirildi!');
        loadActiveTests(); // Ro'yxatni yangilash

    } catch (error) {
        console.error('Testni o\'chirishda xatolik:', error);
        alert('❌ Xatolik yuz berdi!');
    }
}

// Test tafsilotlarini ko'rish
async function viewTestDetails(testId) {
    try {
        const [testResult, answersResult, studentsResult] = await Promise.all([
            supabase.from('tests').select('*').eq('id', testId).single(),
            supabase.from('test_answers').select('*').eq('test_id', testId),
            supabase.from('students').select('*').eq('test_code', '')
        ]);

        const test = testResult.data;
        const answers = answersResult.data || [];

        if (!test) {
            alert('❌ Test topilmadi!');
            return;
        }

        // Test kodiga mos studentlarni topish
        const { data: students } = await supabase
            .from('students')
            .select('*')
            .eq('test_code', test.code);

        let detailsHtml = `
            <h4>📋 Test Tafsilotlari</h4>
            <p><strong>Kod:</strong> ${test.code}</p>
            <p><strong>Nom:</strong> ${test.title}</p>
            <p><strong>Status:</strong> ${test.is_active ? '✅ Faol' : '❌ Nofaol'}</p>
            <p><strong>Savollar:</strong> Ochiq: ${test.open_questions_count}, Yopiq: ${test.closed_questions_count}</p>
            <p><strong>Javoblar soni:</strong> ${answers.length}</p>
            <p><strong>Ishtirokchilar:</strong> ${students ? students.length : 0}</p>
            <p><strong>Yaratilgan:</strong> ${new Date(test.created_at).toLocaleDateString('uz-UZ')}</p>
        `;

        if (answers.length > 0) {
            detailsHtml += '<h5>📝 To\'g\'ri Javoblar:</h5>';
            answers.forEach(answer => {
                detailsHtml += `<p>${answer.question_type === 'open' ? 'Ochiq' : 'Yopiq'} ${answer.question_number}: <strong>${answer.correct_answer}</strong></p>`;
            });
        }

        document.getElementById('testManagement').innerHTML = detailsHtml;

    } catch (error) {
        console.error('Test tafsilotlarini olishda xatolik:', error);
        alert('❌ Xatolik yuz berdi!');
    }
}

// Natijalarni export qilish
async function exportResults() {
    try {
        const { data: results, error } = await supabase
            .from('students')
            .select(`
                *,
                tests(title, code)
            `)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false });

        if (error) throw error;

        if (!results || results.length === 0) {
            alert('📭 Export qilinadigan natijalar yo\'q!');
            return;
        }

        // CSV yaratish
        let csv = 'Ism,Test Nomi,Test Kodi,Ball,Umumiy,Foiz,Boshlangan,Tugatilgan\n';

        results.forEach(result => {
            csv += `"${result.full_name}","${result.tests?.title}","${result.test_code}",${result.score},${result.total_questions},${result.percentage},"${new Date(result.started_at).toLocaleDateString('uz-UZ')}","${new Date(result.completed_at).toLocaleDateString('uz-UZ')}"\n`;
        });

        // Faylni yuklab olish
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `test_results_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert('✅ Natijalar muvaffaqiyatli export qilindi!');

    } catch (error) {
        console.error('Export qilishda xatolik:', error);
        alert('❌ Export qilishda xatolik yuz berdi!');
    }
}

// Eski ma'lumotlarni o'chirish
async function clearOldData() {
    const confirmText = prompt('Eski ma\'lumotlarni o\'chirish uchun "DELETE" so\'zini kiriting:');

    if (confirmText !== 'DELETE') {
        alert('❌ Bekor qilindi!');
        return;
    }

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 30 kundan eski ma'lumotlarni o'chirish
        await Promise.all([
            supabase
                .from('students')
                .delete()
                .lt('created_at', thirtyDaysAgo.toISOString()),
            supabase
                .from('student_answers')
                .delete()
                .lt('created_at', thirtyDaysAgo.toISOString())
        ]);

        alert('✅ 30 kundan eski ma\'lumotlar o\'chirildi!');
        loadAllData();

    } catch (error) {
        console.error('Ma\'lumotlarni o\'chirishda xatolik:', error);
        alert('❌ Xatolik yuz berdi!');
    }
}

// Barcha ma'lumotlarni yuklash
async function loadAllData() {
    if (isAdmin) {
        await Promise.all([
            loadDashboard(),
            loadUsers(),
            loadTests(),
            loadStudents(),
            loadResults()
        ]);
    }
}

// Keyboard navigation uchun
document.addEventListener('keydown', function(event) {
    if (document.getElementById('testInterface').style.display !== 'none') {
        if (event.key === 'ArrowLeft' && currentQuestionIndex > 0) {
            previousQuestion();
        } else if (event.key === 'ArrowRight' && currentQuestionIndex < testQuestions.length - 1) {
            nextQuestion();
        } else if (event.key === 'Enter' && currentQuestionIndex === testQuestions.length - 1) {
            finishTest();
        }
    }
});

// Sahifa yuklanganda
document.addEventListener('DOMContentLoaded', async () => {
    await checkUserRole();

    // Faqat adminlar uchun avtomatik yangilash
    if (isAdmin) {
        setInterval(loadAllData, 60000); // Har minutda yangilash
    }

    // Form validatsiya
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.value.trim()) {
                this.style.borderColor = '#28a745';
            } else {
                this.style.borderColor = '#ddd';
            }
        });
    });
});

// Window resize events uchun
window.addEventListener('resize', function() {
    // Mobile optimizatsiya
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.form-grid').forEach(grid => {
            grid.style.gridTemplateColumns = '1fr';
        });
    } else {
        document.querySelectorAll('.form-grid').forEach(grid => {
            grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
        });
    }
});

// PWA support uchun
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed');
            });
    });
}

// Online/Offline status
window.addEventListener('online', function() {
    document.body.style.filter = 'none';
    if (document.querySelector('.offline-message')) {
        document.querySelector('.offline-message').remove();
    }
});

window.addEventListener('offline', function() {
    document.body.style.filter = 'grayscale(100%)';
    if (!document.querySelector('.offline-message')) {
        const offlineMsg = document.createElement('div');
        offlineMsg.className = 'offline-message';
        offlineMsg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f44336;
            color: white;
            padding: 10px;
            text-align: center;
            z-index: 9999;
        `;
        offlineMsg.textContent = '⚠️ Internet ulanishi yo\'q. Ba\'zi funksiyalar ishlamasligi mumkin.';
        document.body.appendChild(offlineMsg);
    }
});

// Auto-save function for test answers
let autoSaveTimer;
function autoSaveAnswer() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        if (document.getElementById('currentAnswer')) {
            saveCurrentAnswer();
        }
    }, 2000); // 2 soniya kutib saqlash
}

// Add auto-save event listeners when test interface is shown
function addAutoSaveListeners() {
    const answerInput = document.getElementById('currentAnswer');
    if (answerInput) {
        answerInput.addEventListener('input', autoSaveAnswer);
    }
}