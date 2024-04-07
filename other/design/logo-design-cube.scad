// Parameters
cube_size = 20; // Size of the cube
letter_depth = 2; // Depth of the engraved letters
triangle_height = 10; // Height of the triangle




// Cube with engraved letters
difference() {
    cube(cube_size, center=true);


    rotate([90, 0, 0]){
      translate([0, 0, -cube_size/2 + letter_depth]){
         rotate([0, 180, 0]){
          linear_extrude(height = letter_depth + 1){
              text("P", size = cube_size*(2/3), valign = "center", halign = "center");
          }
         }
      }
    }

    rotate([0, 90, 0]){
      translate([0, 0, -cube_size/2 + letter_depth]){
         rotate([0, 180, 90]){
          linear_extrude(height = letter_depth + 1){
              text("B", size = cube_size*(2/3), valign = "center", halign = "center");
          }
         }
      }
    }

    /*
    translate([0, 0, cube_size/2]){
        rotate([180, 0, 0]){
            linear_extrude(height = letter_depth + 1){
                text("B", size = cube_size/2, valign = "center", halign = "center");
            }
        }
    }
    */


    // Triangle on top
    translate([0, 0, cube_size/2-letter_depth]){
        linear_extrude(height = triangle_height){
             polygon(points=[[0, 0], [-cube_size/2, -cube_size/2], [cube_size/2, -cube_size/2]]);
        }
    }
}


