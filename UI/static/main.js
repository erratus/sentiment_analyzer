        // Global variables for charts
        let pieChart, barChart;

        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            initializeEventListeners();
        });

        function initializeEventListeners() {
            // Single text form
            document.getElementById('sentimentForm').addEventListener('submit', handleSingleAnalysis);
            
            // File upload
            const fileUploadArea = document.getElementById('fileUploadArea');
            const fileInput = document.getElementById('fileInput');
            const uploadBtn = document.getElementById('uploadBtn');

            fileUploadArea.addEventListener('click', () => fileInput.click());
            fileUploadArea.addEventListener('dragover', handleDragOver);
            fileUploadArea.addEventListener('dragleave', handleDragLeave);
            fileUploadArea.addEventListener('drop', handleFileDrop);
            
            fileInput.addEventListener('change', handleFileSelect);
            uploadBtn.addEventListener('click', handleFileUpload);
        }

        async function handleSingleAnalysis(e) {
            e.preventDefault();
            
            const textInput = document.getElementById('textInput');
            const analyzeBtn = document.getElementById('analyzeBtn');
            const text = textInput.value.trim();
            
            if (!text) {
                showToast('Please enter some text to analyze.', 'error');
                return;
            }

            // Show loading state
            analyzeBtn.innerHTML = '<span class="loading me-2"></span>Analyzing...';
            analyzeBtn.disabled = true;

            try {
                const response = await fetch('/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: text })
                });

                const data = await response.json();

                if (data.success) {
                    displaySingleResult(data.result);
                    showToast('Analysis completed successfully!', 'success');
                } else {
                    showToast(data.error || 'Analysis failed', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Network error occurred', 'error');
            } finally {
                // Reset button
                analyzeBtn.innerHTML = '<i class="fas fa-search me-2"></i>Analyze Sentiment';
                analyzeBtn.disabled = false;
            }
        }

        function displaySingleResult(result) {
            const resultDiv = document.getElementById('singleResult');
            const sentimentDisplay = document.getElementById('sentimentDisplay');
            const confidenceBar = document.getElementById('confidenceBar');
            const confidenceText = document.getElementById('confidenceText');
            const probabilitiesDisplay = document.getElementById('probabilitiesDisplay');

            // Show result section
            resultDiv.style.display = 'block';
            resultDiv.classList.add('result-animation');

            // Display sentiment
            const sentiment = result.predicted_sentiment;
            const confidence = (result.confidence * 100).toFixed(1);
            
            let sentimentClass = 'sentiment-neutral';
            let sentimentIcon = 'fas fa-meh';
            
            if (sentiment.toLowerCase().includes('positive')) {
                sentimentClass = 'sentiment-positive';
                sentimentIcon = 'fas fa-smile';
            } else if (sentiment.toLowerCase().includes('negative')) {
                sentimentClass = 'sentiment-negative';
                sentimentIcon = 'fas fa-frown';
            }

            sentimentDisplay.innerHTML = `
                <div class="sentiment-badge ${sentimentClass}">
                    <i class="${sentimentIcon} me-2"></i>
                    ${sentiment.toUpperCase()}
                </div>
            `;

            // Update confidence bar
            confidenceBar.style.width = confidence + '%';
            confidenceText.textContent = `${confidence}% confident`;

            // Display all probabilities
            let probHtml = '<strong>All Sentiment Probabilities:</strong><br>';
            for (const [label, prob] of Object.entries(result.all_probabilities)) {
                const percentage = (prob * 100).toFixed(1);
                probHtml += `<small class="text-muted">${label}: ${percentage}%</small><br>`;
            }
            probabilitiesDisplay.innerHTML = probHtml;

            // Scroll to result
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.currentTarget.classList.add('dragover');
        }

        function handleDragLeave(e) {
            e.currentTarget.classList.remove('dragover');
        }

        function handleFileDrop(e) {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelection(files[0]);
            }
        }

        function handleFileSelect(e) {
            const files = e.target.files;
            if (files.length > 0) {
                handleFileSelection(files[0]);
            }
        }

        function handleFileSelection(file) {
            const uploadBtn = document.getElementById('uploadBtn');
            
            if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
                uploadBtn.style.display = 'block';
                uploadBtn.innerHTML = `<i class="fas fa-upload me-2"></i>Upload & Analyze "${file.name}"`;
                showToast(`File "${file.name}" selected. Click upload to analyze.`, 'success');
            } else {
                showToast('Please select a valid CSV or TXT file.', 'error');
                uploadBtn.style.display = 'none';
            }
        }

        async function handleFileUpload() {
            const fileInput = document.getElementById('fileInput');
            const uploadProgress = document.getElementById('uploadProgress');
            const uploadBtn = document.getElementById('uploadBtn');
            
            if (!fileInput.files || fileInput.files.length === 0) {
                showToast('Please select a file first.', 'error');
                return;
            }

            const formData =