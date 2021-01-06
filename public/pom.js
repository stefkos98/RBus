var r1=document.getElementById("exampleRadios1");
var r2=document.getElementById("exampleRadios2");
var p=document.getElementById("datum2");

r1.addEventListener("change", function(){
    if(r1.checked)
    {
        p.style.display="none";
    }
});
r2.addEventListener("change", function(){
    if(r2.checked)
    {
        p.style.display="block";
    }
});