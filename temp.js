function outer() {
    function level1() {
        function level2() {
            function level3() {
                function level4() {
                    function level5() {
                        function level6() {
                            function level7() {
                                function level8() {
                                    function level9() {
                                        function level10() {
                                            console.log("Hello from the deep depths!");
                                        }
                                        level10();
                                    }
                                    level9();
                                }
                                level8();
                            }
                            level7();
                        }
                        level6();
                    }
                    level5();
                }
                level4();
            }
            level3();
        }
        level2();
    }
    level1();
}
outer();
