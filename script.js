class SquareCalendar {
    constructor() {
        this.currentDate = new Date();
        this.today = new Date();
        this.weekOffset = -1;
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.holidays = {};
        this.weeksToShow = 6;
        this.defaultWeeks = 6;
        this.diaryEvents = this.loadDiaryEvents();
        
        this.calendarDaysElement = document.getElementById('calendarDays');
        this.todayBtn = document.getElementById('todayBtn');
        this.zoomInBtn = document.getElementById('zoomIn');
        this.zoomOutBtn = document.getElementById('zoomOut');
        
        // 인라인 편집 관련 요소들
        this.inlineEmojiInput = document.getElementById('inlineEmojiInput');
        
        this.currentEditingDate = null;
        this.currentEditingCell = null;
        
        this.init();
    }
    
    async init() {
        await this.loadHolidays();
        this.render();
        this.bindEvents();
    }
    
    async loadHolidays() {
        try {
            const response = await fetch('https://holidays.hyunbin.page/basic.json');
            this.holidays = await response.json();
        } catch (error) {
            console.error('공휴일 데이터를 불러오는데 실패했습니다:', error);
            this.holidays = {};
        }
    }
    
    bindEvents() {
        this.todayBtn.addEventListener('click', () => {
            this.goToToday();
        });
        
        this.zoomInBtn.addEventListener('click', () => {
            this.zoomIn();
        });
        
        this.zoomOutBtn.addEventListener('click', () => {
            this.zoomOut();
        });
        
        // 인라인 편집 이벤트들
        this.inlineEmojiInput.addEventListener('blur', () => {
            this.finishInlineEdit();
        });
        
        this.inlineEmojiInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.finishInlineEdit();
            } else if (e.key === 'Escape') {
                this.cancelInlineEdit();
            }
        });
        
        // 바깥 클릭으로 편집 종료
        document.addEventListener('click', (e) => {
            if (!this.inlineEmojiInput.contains(e.target) && 
                !e.target.classList.contains('day') &&
                !this.inlineEmojiInput.classList.contains('hidden')) {
                this.finishInlineEdit();
            }
        });
        
        // 데스크톱에서만 휠 이벤트 처리
        if (!this.isMobile()) {
            document.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.handleWheel(e);
            }, { passive: false });
        }
        
        // 모바일에서는 터치 스와이프로 주 네비게이션
        if (this.isMobile()) {
            this.bindTouchEvents();
        }
        
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    handleWheel(e) {
        if (this.isScrolling) return;
        
        this.isScrolling = true;
        
        if (e.deltaY > 0) {
            this.navigateWeek(1);
        } else {
            this.navigateWeek(-1);
        }
        
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
        }, 150);
    }
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    bindTouchEvents() {
        let startY = 0;
        let startTime = 0;
        
        this.calendarDaysElement.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        }, { passive: true });
        
        this.calendarDaysElement.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            const deltaY = startY - endY;
            const deltaTime = endTime - startTime;
            
            // 빠른 스와이프만 감지 (300ms 이내, 50px 이상)
            if (deltaTime < 300 && Math.abs(deltaY) > 50) {
                if (deltaY > 0) {
                    this.navigateWeek(1);  // 위로 스와이프 = 다음 주
                } else {
                    this.navigateWeek(-1); // 아래로 스와이프 = 이전 주
                }
            }
        }, { passive: true });
    }
    
    navigateWeek(direction) {
        this.weekOffset += direction;
        this.render();
    }
    
    calculateOptimalWeeks() {
        const viewportHeight = window.innerHeight;
        const buttonHeight = 40;
        const weekdaysHeight = 50;
        const paddingHeight = 40;
        
        const availableHeight = viewportHeight - buttonHeight - weekdaysHeight - paddingHeight;
        const minCellHeight = 50;
        
        const optimalWeeks = Math.floor(availableHeight / minCellHeight);
        return Math.max(4, Math.min(15, optimalWeeks));
    }
    
    handleResize() {
        const maxZoomWeeks = this.calculateMaxZoomWeeks();
        if (this.weeksToShow < maxZoomWeeks) {
            this.weeksToShow = maxZoomWeeks;
        }
        this.render();
    }
    
    zoomIn() {
        const maxZoomWeeks = this.calculateMaxZoomWeeks();
        if (this.weeksToShow > maxZoomWeeks) {
            this.weeksToShow--;
            this.render();
            this.updateZoomButtons();
        }
    }
    
    zoomOut() {
        if (this.weeksToShow < 15) {
            this.weeksToShow++;
            this.render();
            this.updateZoomButtons();
        }
    }
    
    updateZoomButtons() {
        const maxZoomWeeks = this.calculateMaxZoomWeeks();
        this.zoomInBtn.disabled = this.weeksToShow <= maxZoomWeeks;
        this.zoomOutBtn.disabled = this.weeksToShow >= 15;
    }
    
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }
    
    goToToday() {
        this.currentDate = new Date();
        this.weekOffset = -1;
        this.weeksToShow = 6;
        this.render();
    }
    
    render() {
        this.updateCalendarSize();
        this.renderDays();
        this.updateZoomButtons();
    }
    
    updateCalendarSize() {
        const viewportWidth = window.innerWidth;
        const paddingWidth = 60;
        const availableWidth = viewportWidth - paddingWidth;
        const maxCellSizeByWidth = Math.floor(availableWidth / 7);
        
        const viewportHeight = window.innerHeight;
        const buttonHeight = 40;
        const weekdaysHeight = 50;
        const paddingHeight = 40;
        const availableHeight = viewportHeight - buttonHeight - weekdaysHeight - paddingHeight;
        const maxCellSizeByHeight = Math.floor(availableHeight / this.weeksToShow);
        
        const cellHeight = Math.min(maxCellSizeByWidth, maxCellSizeByHeight);
        
        // 월 라벨 폰트 크기 계산 (셀 크기에 비례)
        const monthLabelFontSize = Math.max(10, Math.min(21, Math.floor(cellHeight * 0.25)));
        
        // 일 라벨 폰트 크기 계산
        let dayLabelFontSize;
        if (monthLabelFontSize < 21) {
            // 월 라벨이 축소되면 일 라벨도 동일한 크기
            dayLabelFontSize = monthLabelFontSize;
        } else {
            // 평상시에는 월 라벨의 70% 크기
            dayLabelFontSize = Math.floor(monthLabelFontSize * 0.7);
        }
        
        document.documentElement.style.setProperty('--cell-height', `${cellHeight}px`);
        document.documentElement.style.setProperty('--month-label-font-size', `${monthLabelFontSize}px`);
        document.documentElement.style.setProperty('--day-label-font-size', `${dayLabelFontSize}px`);
    }
    
    calculateMaxZoomWeeks() {
        const viewportWidth = window.innerWidth;
        const paddingWidth = 60;
        const availableWidth = viewportWidth - paddingWidth;
        
        const viewportHeight = window.innerHeight;
        const buttonHeight = 40;
        const weekdaysHeight = 50;
        const paddingHeight = 40;
        const availableHeight = viewportHeight - buttonHeight - weekdaysHeight - paddingHeight;
        
        const maxCellSize = Math.floor(availableWidth / 7);
        const maxWeeksForHeight = Math.floor(availableHeight / maxCellSize);
        
        return Math.max(1, maxWeeksForHeight);
    }
    
    getWeekOfMonth(date) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstWeekStart = this.getWeekStart(firstDay);
        const weekStart = this.getWeekStart(date);
        
        return Math.floor((weekStart - firstWeekStart) / (7 * 24 * 60 * 60 * 1000));
    }
    
    getThisWeekStart() {
        return this.getWeekStart(this.today);
    }
    
    isHoliday(date) {
        const dateStr = this.formatDate(date);
        const year = date.getFullYear().toString();
        return this.holidays[year] && this.holidays[year][dateStr];
    }
    
    formatDate(date) {
        return date.getFullYear() + '-' + 
               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
               String(date.getDate()).padStart(2, '0');
    }
    
    renderDays() {
        const thisWeekStart = this.getThisWeekStart();
        
        const startWeek = new Date(thisWeekStart);
        startWeek.setDate(startWeek.getDate() + (this.weekOffset * 7));
        
        this.calendarDaysElement.innerHTML = '';
        
        for (let week = 0; week < this.weeksToShow; week++) {
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(startWeek);
                cellDate.setDate(cellDate.getDate() + (week * 7) + day);
                
                const isToday = this.isToday(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
                const cellWeekStart = this.getWeekStart(cellDate);
                const isPast = cellWeekStart < thisWeekStart;
                const isHolidayDate = this.isHoliday(cellDate);
                const isSunday = cellDate.getDay() === 0;
                const isSaturday = cellDate.getDay() === 6;
                
                const isFirstOfMonth = cellDate.getDate() === 1;
                
                if (isFirstOfMonth) {
                    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
                    const dayElement = this.createDayElement(
                        monthNames[cellDate.getMonth()],
                        isPast,
                        isToday,
                        true,
                        isHolidayDate,
                        isSunday,
                        isSaturday,
                        null
                    );
                    this.calendarDaysElement.appendChild(dayElement);
                } else {
                    const dayElement = this.createDayElement(
                        cellDate.getDate(),
                        isPast,
                        isToday,
                        false,
                        isHolidayDate,
                        isSunday,
                        isSaturday,
                        cellDate
                    );
                    
                    this.calendarDaysElement.appendChild(dayElement);
                }
            }
        }
    }
    
    createDayElement(day, isPast = false, isToday = false, isMonthLabel = false, isHolidayDate = false, isSunday = false, isSaturday = false, cellDate = null) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day';
        
        if (isPast) {
            dayElement.classList.add('past');
        }
        
        if (isToday) {
            dayElement.classList.add('today');
        }
        
        if (isMonthLabel) {
            dayElement.classList.add('month-label');
            dayElement.textContent = day;
        } else {
            // 날짜 셀에는 클릭 이벤트와 이모지 표시
            dayElement.classList.add('clickable');
            
            const dayContent = document.createElement('div');
            dayContent.className = 'day-content';
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            
            const dayEmojis = document.createElement('div');
            dayEmojis.className = 'day-emojis';
            
            // 해당 날짜의 이벤트 이모지들 표시
            if (cellDate) {
                const dateStr = this.formatDate(cellDate);
                const emojis = this.diaryEvents[dateStr] || [];
                emojis.forEach(emoji => {
                    const emojiSpan = document.createElement('span');
                    emojiSpan.className = 'day-emoji';
                    emojiSpan.textContent = emoji;
                    dayEmojis.appendChild(emojiSpan);
                });
                
                // 날짜 클릭 이벤트 (인라인 편집)
                dayElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.startInlineEdit(cellDate, dayElement);
                });
            }
            
            dayContent.appendChild(dayNumber);
            dayContent.appendChild(dayEmojis);
            dayElement.appendChild(dayContent);
        }
        
        if (isHolidayDate) {
            dayElement.classList.add('holiday');
        }
        
        if (isSunday) {
            dayElement.classList.add('sunday');
        }
        
        if (isSaturday) {
            dayElement.classList.add('saturday');
        }
        
        return dayElement;
    }
    
    isToday(year, month, day) {
        return year === this.today.getFullYear() &&
               month === this.today.getMonth() &&
               day === this.today.getDate();
    }
    
    
    // 일기 관련 메서드들
    loadDiaryEvents() {
        const saved = localStorage.getItem('diaryEvents');
        return saved ? JSON.parse(saved) : {};
    }
    
    saveDiaryEvents() {
        localStorage.setItem('diaryEvents', JSON.stringify(this.diaryEvents));
    }
    
    startInlineEdit(date, cellElement) {
        // 이미 편집 중이면 이전 편집 완료
        if (!this.inlineEmojiInput.classList.contains('hidden')) {
            this.finishInlineEdit();
        }
        
        this.currentEditingDate = date;
        this.currentEditingCell = cellElement;
        
        // 해당 날짜의 기존 이모지들 로드
        const dateStr = this.formatDate(date);
        const existingEmojis = this.diaryEvents[dateStr] || [];
        
        // 셀 위치 계산
        const rect = cellElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // 입력창 위치 설정 (셀 중앙)
        this.inlineEmojiInput.style.left = `${rect.left + scrollLeft + rect.width/2 - 40}px`;
        this.inlineEmojiInput.style.top = `${rect.top + scrollTop + rect.height/2 - 20}px`;
        
        // 기존 이모지들을 입력창에 표시
        this.inlineEmojiInput.value = existingEmojis.join('');
        
        // 입력창 표시 및 포커스
        this.inlineEmojiInput.classList.remove('hidden');
        this.inlineEmojiInput.focus();
        this.inlineEmojiInput.select(); // 기존 텍스트 선택
    }
    
    finishInlineEdit() {
        if (this.inlineEmojiInput.classList.contains('hidden')) return;
        
        // 입력된 이모지들 파싱
        const inputText = this.inlineEmojiInput.value;
        const emojis = this.parseEmojisFromText(inputText);
        
        // 데이터 업데이트
        if (this.currentEditingDate) {
            const dateStr = this.formatDate(this.currentEditingDate);
            if (emojis.length > 0) {
                this.diaryEvents[dateStr] = emojis;
            } else {
                delete this.diaryEvents[dateStr];
            }
            
            this.saveDiaryEvents();
            this.render(); // 캘린더 다시 그리기
        }
        
        // 편집 상태 정리
        this.inlineEmojiInput.classList.add('hidden');
        this.currentEditingDate = null;
        this.currentEditingCell = null;
    }
    
    cancelInlineEdit() {
        this.inlineEmojiInput.classList.add('hidden');
        this.currentEditingDate = null;
        this.currentEditingCell = null;
    }
    
    parseEmojisFromText(text) {
        // 더 포괄적인 이모지 정규식
        const emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
        
        const emojis = text.match(emojiRegex) || [];
        
        // 중복 제거하면서 순서 유지
        return [...new Set(emojis)];
    }
}

// 페이지 로드 시 달력 초기화
document.addEventListener('DOMContentLoaded', () => {
    new SquareCalendar();
});