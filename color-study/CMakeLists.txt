cmake_minimum_required(VERSION 3.15)
project(four_cube_color_study LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(color_study color_study.cpp)        # 排列數（24 面如何排到四方塊）
add_executable(combinations combinations.cpp)       # 組合數（除去每顆方塊的 24 旋轉）

foreach(tgt color_study combinations)
  if(MSVC)
    target_compile_options(${tgt} PRIVATE /O2 /W4)
  else()
    target_compile_options(${tgt} PRIVATE -O2 -Wall -Wextra)
  endif()
endforeach()
