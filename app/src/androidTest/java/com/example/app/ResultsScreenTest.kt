package com.example.app

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.unit.dp
import org.junit.Rule
import org.junit.Test

class ResultsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun volverAJugarButton_hasMinimumHeightOf48dp() {
        composeTestRule.setContent {
            ResultsScreen()
        }

        composeTestRule.onNodeWithText("Volver a jugar")
            .assertHeightIsAtLeast(48.dp)
    }
}
