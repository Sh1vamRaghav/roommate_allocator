document.getElementById("loginForm")?.addEventListener("submit", function(e){
    e.preventDefault();

    const role = document.getElementById("role").value;

    if(role === "STUDENT"){
        window.location.href = "student-dashboard.html";
    } else {
        window.location.href = "admin-dashboard.html";
    }
});
/* ================= REGISTER FUNCTION ================= */

document.getElementById("registerForm")?.addEventListener("submit", function(e){
    e.preventDefault();

    const studentData = {
        name: document.getElementById("name").value,
        age: document.getElementById("age").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value,
        college: document.getElementById("college").value,
        year: document.getElementById("year").value,
        course: document.getElementById("course").value,
        email: document.getElementById("email").value
    };

    localStorage.setItem("studentData", JSON.stringify(studentData));

    alert("Account Created Successfully!");

    window.location.href = "login.html";
});
/* ================= LOAD STUDENTS IN ADMIN ================= */

function loadStudents() {
    const studentData = JSON.parse(localStorage.getItem("studentData"));

    const tableBody = document.getElementById("studentTableBody");

    if (!studentData || !tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td>${studentData.name}</td>
            <td>${studentData.college}</td>
            <td>${studentData.course}</td>
            <td id="statusCell">Not Allocated</td>
            <td id="roomCell">--</td>
        </tr>
    `;
}

document.addEventListener("DOMContentLoaded", loadStudents);


/* ================= SIMPLE ALLOCATION ================= */

function runAllocation() {
    const studentData = JSON.parse(localStorage.getItem("studentData"));

    if (!studentData) {
        alert("No students registered!");
        return;
    }

    const roomNumber = "Room-" + Math.floor(Math.random() * 100 + 1);

    localStorage.setItem("assignedRoom", roomNumber);

    document.getElementById("statusCell").innerText = "Allocated";
    document.getElementById("roomCell").innerText = roomNumber;

    document.getElementById("allocationMessage").innerText =
        "Room Allocation Completed Successfully!";
}