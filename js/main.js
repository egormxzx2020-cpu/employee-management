document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:8080/api/employees';
    let employees = [];

    const form = document.getElementById('employeeForm');
    const tableBody = document.getElementById('employeeTableBody');
    const emptyMessage = document.getElementById('emptyMessage');

    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const editEmpId = document.getElementById('editEmpId');
    const editFullName = document.getElementById('editFullName');
    const editPosition = document.getElementById('editPosition');
    const editDepartment = document.getElementById('editDepartment');
    const editSalary = document.getElementById('editSalary');

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text ?? '';
        return div.innerHTML;
    }

    function escapeXml(unsafe) {
        return String(unsafe ?? '').replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    }

    // Сохранение XML прямо в файл на диске через Java
    async function syncWithXmlFile() {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<employees>\n';
        employees.forEach((emp) => {
            xml += '    <employee>\n';
            xml += `        <id>${emp.id}</id>\n`;
            xml += `        <fullName>${escapeXml(emp.fullName)}</fullName>\n`;
            xml += `        <position>${escapeXml(emp.position)}</position>\n`;
            xml += `        <department>${escapeXml(emp.department)}</department>\n`;
            xml += `        <salary>${emp.salary}</salary>\n`;
            xml += `        <isDismissed>${emp.isDismissed}</isDismissed>\n`;
            xml += '    </employee>\n';
        });
        xml += '</employees>';

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/xml' },
                body: xml
            });
        } catch (e) {
            console.error('Ошибка записи в файл data.xml через Java:', e);
        }
    }

    // Чтение XML из файла через Java
    async function loadFromXmlFile() {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) return;
            const xmlText = await res.text();
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
            const nodes = xmlDoc.getElementsByTagName('employee');

            employees = [];
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                employees.push({
                    id: Number(node.getElementsByTagName('id')[0]?.textContent || Date.now() + i),
                    fullName: node.getElementsByTagName('fullName')[0]?.textContent || '',
                    position: node.getElementsByTagName('position')[0]?.textContent || '',
                    department: node.getElementsByTagName('department')[0]?.textContent || '',
                    salary: node.getElementsByTagName('salary')[0]?.textContent || '0',
                    isDismissed: node.getElementsByTagName('isDismissed')[0]?.textContent === 'true'
                });
            }
            renderTable();
        } catch (e) {
            console.warn('Сервер Java пока не запущен. Запустите backend/Server.java для записи в data.xml.');
        }
    }

    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (employees.length === 0) {
            if (emptyMessage) emptyMessage.style.display = 'block';
            return;
        }

        if (emptyMessage) emptyMessage.style.display = 'none';

        employees.forEach((emp) => {
            const isDismissed = Boolean(emp.isDismissed);
            const tr = document.createElement('tr');
            if (isDismissed) tr.classList.add('dismissed-row');

            tr.innerHTML = `
                <td>${emp.id}</td>
                <td>${escapeHtml(emp.fullName)}</td>
                <td>${escapeHtml(emp.position)}</td>
                <td>${escapeHtml(emp.department)}</td>
                <td>${Number(emp.salary).toLocaleString('ru-RU')} ₽</td>
                <td>
                    <span class="badge ${isDismissed ? 'badge-dismissed' : 'badge-active'}">
                        ${isDismissed ? 'Уволен' : 'Работает'}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button type="button" class="btn btn-secondary" onclick="openEditModal(${emp.id})" ${isDismissed ? 'disabled' : ''}>Ред.</button>
                        <button type="button" class="btn ${isDismissed ? 'btn-success' : 'btn-warning'}" onclick="toggleDismissStatus(${emp.id})">${isDismissed ? 'Восстановить' : 'Уволить'}</button>
                        <button type="button" class="btn btn-danger" onclick="deleteEmployee(${emp.id})">Удалить</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newEmployee = {
                id: Date.now(),
                fullName: document.getElementById('fullName').value.trim(),
                position: document.getElementById('position').value.trim(),
                department: document.getElementById('department').value.trim(),
                salary: document.getElementById('salary').value.trim(),
                isDismissed: false
            };

            employees.push(newEmployee);
            renderTable();
            form.reset();
            await syncWithXmlFile();
        });
    }

    window.toggleDismissStatus = async function (id) {
        const target = employees.find((emp) => emp.id === id);
        if (target) {
            target.isDismissed = !target.isDismissed;
            renderTable();
            await syncWithXmlFile();
        }
    };

    window.openEditModal = function (id) {
        const emp = employees.find((e) => e.id === id);
        if (!emp || emp.isDismissed || !editModal) return;

        editEmpId.value = emp.id;
        editFullName.value = emp.fullName;
        editPosition.value = emp.position;
        editDepartment.value = emp.department;
        editSalary.value = emp.salary;

        editModal.classList.add('show');
    };

    window.closeEditModal = function () {
        if (!editModal) return;
        editModal.classList.remove('show');
        if (editForm) editForm.reset();
    };

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = Number(editEmpId.value);
            const empIndex = employees.findIndex((emp) => emp.id === id);

            if (empIndex !== -1 && !employees[empIndex].isDismissed) {
                employees[empIndex].fullName = editFullName.value.trim();
                employees[empIndex].position = editPosition.value.trim();
                employees[empIndex].department = editDepartment.value.trim();
                employees[empIndex].salary = editSalary.value.trim();

                renderTable();
                window.closeEditModal();
                await syncWithXmlFile();
            }
        });
    }

    window.deleteEmployee = async function (id) {
        employees = employees.filter((emp) => emp.id !== id);
        renderTable();
        await syncWithXmlFile();
    };

    loadFromXmlFile();
});