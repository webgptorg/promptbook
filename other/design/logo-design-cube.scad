
$fn=10; // Number of facets
cube_size = 20; // Size of the cube
letter_P_depth = 20; // Depth of the engraved P letter
letter_B_depth = 20; // Depth of the engraved B letter
triangle_depth = 2; // Depth of the engraved triangle


// Cube with engraved letters P and B and a triangle on top
difference() {
    cube(cube_size, center=true);

    // Engraved letter P
    rotate([90, 0, 0]){
      translate([0, 0, -cube_size/2 + letter_P_depth]){
         rotate([0, 180, 0]){
          linear_extrude(height = letter_P_depth ){
              text("P", size = cube_size*(2/3), valign = "center", halign = "center");
          }
         }
      }
    }

    // Engraved letter B
    rotate([0, 90, 0]){
      translate([0, 0, -cube_size/2 + letter_B_depth]){
         rotate([0, 180, 90]){
          linear_extrude(height = letter_B_depth ){
              text("B", size = cube_size*(2/3), valign = "center", halign = "center");
          }
         }
      }
    }


    // Triangle on top
    translate([0, 0, cube_size/2-triangle_depth]){
        linear_extrude(height = triangle_depth){
             polygon(points=[[0, 0], [-cube_size/2, -cube_size/2], [cube_size/2, -cube_size/2]]);
        }
    }
}


