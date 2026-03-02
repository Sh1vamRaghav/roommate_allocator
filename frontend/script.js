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