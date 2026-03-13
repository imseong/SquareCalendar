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

        this.calendarDaysElement = document.getElementById('calendarDays');
        this.todayBtn = document.getElementById('todayBtn');
        this.zoomInBtn = document.getElementById('zoomIn');
        this.zoomOutBtn = document.getElementById('zoomOut');
        this.helpBtn = document.getElementById('helpBtn');
        this.helpTooltip = document.getElementById('helpTooltip');

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

        this.helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.helpTooltip.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!this.helpTooltip.contains(e.target) && !this.helpBtn.contains(e.target)) {
                this.helpTooltip.classList.add('hidden');
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
                
                const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
                const dayElement = this.createDayElement(
                    isFirstOfMonth ? monthNames[cellDate.getMonth()] : cellDate.getDate(),
                    isPast,
                    isToday,
                    isFirstOfMonth,
                    isHolidayDate,
                    isSunday,
                    isSaturday
                );
                this.calendarDaysElement.appendChild(dayElement);
            }
        }
    }
    
    createDayElement(day, isPast = false, isToday = false, isMonthLabel = false, isHolidayDate = false, isSunday = false, isSaturday = false) {
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
        }

        dayElement.textContent = day;
        
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
}

// 페이지 로드 시 달력 초기화
document.addEventListener('DOMContentLoaded', () => {
    new SquareCalendar();
});